import { BadRequestException, Inject, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { and, eq, inArray, lte } from "drizzle-orm";
import { validateComposition } from "@socialhub/contracts";
import { DatabaseService } from "../db/database.service";
import { mediaAssets, postMedia, postTargets, posts, publishAttempts, socialAccounts } from "../db/schema";
import { providerFor } from "../integrations/providers";
import { aggregateTargets } from "./aggregate";

type LoadedTarget = {
  id: string;
  status: string;
  attemptCount: number;
  accountId: string;
  platform: string;
  connectionMode: string;
  accountStatus: string;
  simulateNextFailure: boolean;
};

@Injectable()
export class PublishingService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async onModuleInit() {
    if (process.env.WORKER_ENABLED === "false") return;
    const url = process.env.REDIS_URL;
    if (url) {
      const connection = { url, maxRetriesPerRequest: null as null };
      this.queue = new Queue("publish-post", { connection });
      this.worker = new Worker(
        "publish-post",
        async (job: { data: { postId: string } }) => {
          await this.claimAndRun(job.data.postId);
        },
        { connection },
      );
    }
    this.timer = setInterval(() => {
      this.sweepDue().catch((error) => console.error("Publish sweep failed", error));
    }, 20_000);
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
  }

  async assertReady(postId: string) {
    const loaded = await this.load(postId);
    const errors = this.problems(loaded.post, loaded.media, loaded.targets);
    if (errors.length) {
      throw new BadRequestException({ message: errors[0], fields: { composition: errors.join(" ") } });
    }
    return loaded;
  }

  async schedule(postId: string, when: Date) {
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 30_000) {
      throw new BadRequestException({
        message: "Choose a time at least a minute from now.",
        fields: { scheduledAt: "Choose a time at least a minute from now." },
      });
    }
    await this.assertReady(postId);
    await this.database.db
      .update(posts)
      .set({ status: "scheduled", scheduledAt: when, updatedAt: new Date() })
      .where(eq(posts.id, postId));
    await this.database.db
      .update(postTargets)
      .set({ status: "scheduled", updatedAt: new Date() })
      .where(eq(postTargets.postId, postId));
    await this.enqueue(postId, when);
  }

  async release(postId: string) {
    await this.removeJob(postId);
  }

  async cancel(postId: string) {
    const [post] = await this.database.db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new NotFoundException("That post is not on the desk.");
    if (post.status !== "scheduled") {
      throw new BadRequestException({ message: "Only a scheduled post can be cancelled." });
    }
    await this.removeJob(postId);
    await this.database.db
      .update(posts)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(posts.id, postId));
    await this.database.db
      .update(postTargets)
      .set({ status: "skipped", summary: "Cancelled before the simulation ran. Nothing was sent.", updatedAt: new Date() })
      .where(eq(postTargets.postId, postId));
  }

  async publishNow(postId: string) {
    const [post] = await this.database.db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new NotFoundException("That post is not on the desk.");
    if (post.status === "publishing") {
      throw new BadRequestException({ message: "This post is already sending. Wait for the result." });
    }
    await this.assertReady(postId);
    await this.removeJob(postId);
    await this.database.db
      .update(posts)
      .set({ status: "queued", scheduledAt: new Date(), updatedAt: new Date() })
      .where(eq(posts.id, postId));
    await this.claimAndRun(postId);
  }

  async retry(postId: string) {
    const [post] = await this.database.db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new NotFoundException("That post is not on the desk.");
    if (post.status !== "failed" && post.status !== "partial") {
      throw new BadRequestException({ message: "Only a failed or incomplete post can be retried." });
    }
    await this.claimAndRun(postId);
  }

  async sweepDue() {
    const due = await this.database.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, new Date())));
    for (const post of due) {
      await this.claimAndRun(post.id);
    }
  }

  async claimAndRun(postId: string) {
    const claimed = await this.database.db
      .update(posts)
      .set({ status: "publishing", updatedAt: new Date() })
      .where(and(eq(posts.id, postId), inArray(posts.status, ["scheduled", "queued", "failed", "partial"])))
      .returning({ id: posts.id });
    if (claimed.length === 0) return;

    const loaded = await this.load(postId);
    for (const target of loaded.targets) {
      if (target.status === "published") continue;
      await this.runTarget(loaded.post, loaded.media, target);
    }

    const fresh = await this.database.db.select().from(postTargets).where(eq(postTargets.postId, postId));
    const aggregate = aggregateTargets(
      fresh.map((target) => ({ status: target.status, publishingMode: target.publishingMode })),
    );
    await this.database.db
      .update(posts)
      .set({
        status: aggregate.status,
        publishingMode: aggregate.publishingMode,
        publishedAt: aggregate.status === "published" || aggregate.status === "partial" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  }

  private async runTarget(
    post: { body: string; format: string },
    media: { kind: string; mimeType: string }[],
    target: LoadedTarget,
  ) {
    const startedAt = new Date();
    const mode = target.connectionMode === "live" ? "live" : "simulated";
    const problems = this.problems(post, media, [target]);
    let result;
    if (target.accountStatus !== "connected") {
      const errorMessage = `The account is disconnected, so nothing was sent.`;
      result = {
        ok: false,
        publishingMode: mode,
        simulated: mode === "simulated",
        externalPostId: null,
        errorCode: "disconnected",
        errorMessage,
        summary: mode === "simulated" ? `Simulated failure. Nothing was sent. ${errorMessage}` : errorMessage,
      };
    } else if (problems.length) {
      const errorMessage = problems.join(" ");
      result = {
        ok: false,
        publishingMode: mode,
        simulated: mode === "simulated",
        externalPostId: null,
        errorCode: "invalid_composition",
        errorMessage,
        summary: mode === "simulated" ? `Simulated failure. Nothing was sent. ${errorMessage}` : errorMessage,
      };
    } else {
      const provider = providerFor(target.connectionMode);
      const fail = mode === "simulated" && target.simulateNextFailure;
      result = await provider.publish({ platform: target.platform, fail });
      if (fail) {
        await this.database.db
          .update(socialAccounts)
          .set({ simulateNextFailure: false, updatedAt: new Date() })
          .where(eq(socialAccounts.id, target.accountId));
      }
    }

    await this.database.db.insert(publishAttempts).values({
      postTargetId: target.id,
      publishingMode: result.publishingMode,
      simulated: result.simulated,
      outcome: result.ok ? "succeeded" : "failed",
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      summary: result.summary,
      externalPostId: result.externalPostId,
      startedAt,
      finishedAt: new Date(),
    });
    await this.database.db
      .update(postTargets)
      .set({
        status: result.ok ? "published" : "failed",
        publishingMode: result.publishingMode,
        externalPostId: result.externalPostId,
        lastError: result.errorMessage,
        summary: result.summary,
        attemptCount: target.attemptCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(postTargets.id, target.id));
  }

  private problems(
    post: { body: string; format: string },
    media: { kind: string; mimeType: string }[],
    targets: { platform: string; accountStatus: string }[],
  ) {
    if (targets.length === 0) return ["Choose at least one account."];
    const errors: string[] = [];
    for (const target of targets) {
      if (target.accountStatus !== "connected") {
        errors.push("Reconnect the account before this slot can run.");
      }
      for (const issue of validateComposition({
        format: post.format,
        body: post.body,
        media,
        platform: target.platform,
      })) {
        errors.push(issue.message);
      }
    }
    return errors;
  }

  private async load(postId: string) {
    const [post] = await this.database.db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new NotFoundException("That post is not on the desk.");
    const links = await this.database.db.select().from(postMedia).where(eq(postMedia.postId, postId));
    const mediaIds = links.sort((a, b) => a.sortOrder - b.sortOrder).map((link) => link.mediaId);
    const media = mediaIds.length
      ? await this.database.db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds))
      : [];
    const orderedMedia = mediaIds
      .map((id) => media.find((item) => item.id === id))
      .filter((item): item is (typeof media)[number] => Boolean(item));
    const targets = await this.database.db
      .select({
        id: postTargets.id,
        status: postTargets.status,
        attemptCount: postTargets.attemptCount,
        accountId: socialAccounts.id,
        platform: socialAccounts.platform,
        connectionMode: socialAccounts.connectionMode,
        accountStatus: socialAccounts.status,
        simulateNextFailure: socialAccounts.simulateNextFailure,
      })
      .from(postTargets)
      .innerJoin(socialAccounts, eq(socialAccounts.id, postTargets.socialAccountId))
      .where(eq(postTargets.postId, postId));
    return { post, media: orderedMedia, targets };
  }

  private async enqueue(postId: string, when: Date) {
    if (!this.queue) return;
    const jobId = `post-${postId}`;
    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) await existing.remove();
      await this.queue.add(
        "publish",
        { postId },
        { jobId, delay: Math.max(0, when.getTime() - Date.now()), removeOnComplete: 200, removeOnFail: 200 },
      );
    } catch (error) {
      console.error("Delayed publish was not queued. The sweeper will still pick it up.", error);
    }
  }

  private async removeJob(postId: string) {
    if (!this.queue) return;
    try {
      const existing = await this.queue.getJob(`post-${postId}`);
      if (existing) await existing.remove();
    } catch (error) {
      console.error("Could not remove the delayed publish.", error);
    }
  }
}
