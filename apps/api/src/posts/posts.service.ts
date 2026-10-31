import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { statusLabel, validateComposition } from "@socialhub/contracts";
import { DatabaseService } from "../db/database.service";
import {
  brands,
  collections,
  mediaAssets,
  postMedia,
  postTargets,
  posts,
  publishAttempts,
  socialAccounts,
} from "../db/schema";
import { PublishingService } from "../publishing/publishing.service";

type SaveInput = {
  brandId: string;
  collectionId?: string | null;
  title: string;
  body?: string;
  format: string;
  mediaIds?: string[];
  accountIds?: string[];
};

@Injectable()
export class PostsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PublishingService) private readonly publishing: PublishingService,
  ) {}

  async list(filters: { brandId?: string; status?: string; collectionId?: string }) {
    const conditions = [];
    if (filters.brandId) conditions.push(eq(posts.brandId, filters.brandId));
    if (filters.status) conditions.push(eq(posts.status, filters.status));
    if (filters.collectionId) conditions.push(eq(posts.collectionId, filters.collectionId));
    const rows = await this.database.db
      .select({
        post: posts,
        brandName: brands.name,
        collectionName: collections.name,
      })
      .from(posts)
      .innerJoin(brands, eq(brands.id, posts.brandId))
      .leftJoin(collections, eq(collections.id, posts.collectionId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(posts.updatedAt));
    return this.assemble(rows, false);
  }

  async view(id: string) {
    const rows = await this.database.db
      .select({ post: posts, brandName: brands.name, collectionName: collections.name })
      .from(posts)
      .innerJoin(brands, eq(brands.id, posts.brandId))
      .leftJoin(collections, eq(collections.id, posts.collectionId))
      .where(eq(posts.id, id));
    const [view] = await this.assemble(rows, true);
    if (!view) throw new NotFoundException("That post is not on the desk.");
    return view;
  }

  async create(input: SaveInput) {
    await this.assertRelations(input);
    const [post] = await this.database.db
      .insert(posts)
      .values({
        brandId: input.brandId,
        collectionId: input.collectionId || null,
        title: input.title.trim(),
        body: input.body ?? "",
        format: input.format,
        status: "draft",
      })
      .returning();
    await this.replaceLinks(post.id, {
      ...input,
      body: input.body ?? "",
      mediaIds: input.mediaIds ?? [],
      accountIds: input.accountIds ?? [],
    });
    return this.view(post.id);
  }

  async update(id: string, input: SaveInput) {
    const [existing] = await this.database.db.select().from(posts).where(eq(posts.id, id));
    if (!existing) throw new NotFoundException("That post is not on the desk.");
    if (existing.status === "publishing") {
      throw new BadRequestException({ message: "Wait until the current attempt finishes before editing." });
    }
    if (existing.status === "published" || existing.status === "partial") {
      throw new BadRequestException({ message: "Duplicate this post if you want to change a finished slot." });
    }
    await this.assertRelations(input);
    if (existing.status === "scheduled") await this.ensureComposition(input);
    await this.database.db
      .update(posts)
      .set({
        brandId: input.brandId,
        collectionId: input.collectionId || null,
        title: input.title.trim(),
        body: input.body ?? "",
        format: input.format,
        status: existing.status === "cancelled" ? "draft" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    if (existing.status === "failed") {
      await this.replaceMedia(id, input.mediaIds ?? []);
    } else {
      await this.database.db.delete(postTargets).where(eq(postTargets.postId, id));
      await this.replaceLinks(id, input);
    }

    if (existing.status === "scheduled") {
      await this.publishing.assertReady(id);
      if (existing.scheduledAt) await this.publishing.schedule(id, existing.scheduledAt);
    }
    return this.view(id);
  }

  async remove(id: string) {
    const [existing] = await this.database.db.select().from(posts).where(eq(posts.id, id));
    if (!existing) throw new NotFoundException("That post is not on the desk.");
    if (existing.status === "publishing") {
      throw new BadRequestException({ message: "Wait until the current attempt finishes before deleting." });
    }
    await this.publishing.release(id);
    await this.database.db.delete(posts).where(eq(posts.id, id));
    return { deleted: true };
  }

  async duplicate(id: string) {
    const source = await this.view(id);
    return this.create({
      brandId: source.brandId,
      collectionId: source.collectionId,
      title: `${source.title} copy`,
      body: source.body,
      format: source.format,
      mediaIds: source.media.map((item) => item.id),
      accountIds: source.targets.map((target) => target.accountId),
    });
  }

  async calendar(from: Date, to: Date, brandId?: string) {
    const items = await this.list({ brandId });
    return items.filter((item) => {
      const stamp = item.scheduledAt || item.publishedAt;
      if (!stamp) return false;
      const time = new Date(stamp).getTime();
      return time >= from.getTime() && time <= to.getTime();
    });
  }

  async history(brandId?: string) {
    const rows = await this.database.db
      .select({
        attempt: publishAttempts,
        target: postTargets,
        post: posts,
        brandName: brands.name,
        platform: socialAccounts.platform,
        displayName: socialAccounts.displayName,
      })
      .from(publishAttempts)
      .innerJoin(postTargets, eq(postTargets.id, publishAttempts.postTargetId))
      .innerJoin(posts, eq(posts.id, postTargets.postId))
      .innerJoin(brands, eq(brands.id, posts.brandId))
      .innerJoin(socialAccounts, eq(socialAccounts.id, postTargets.socialAccountId))
      .where(brandId ? eq(posts.brandId, brandId) : undefined as never)
      .orderBy(desc(publishAttempts.finishedAt));

    return rows.map((row) => ({
      id: row.attempt.id,
      postId: row.post.id,
      title: row.post.title,
      brandName: row.brandName,
      platform: row.platform,
      displayName: row.displayName,
      publishingMode: row.attempt.publishingMode,
      simulated: row.attempt.simulated,
      outcome: row.attempt.outcome,
      summary: row.attempt.summary,
      errorCode: row.attempt.errorCode,
      externalPostId: row.attempt.externalPostId,
      finishedAt: row.attempt.finishedAt,
      statusLabel: statusLabel({
        status: row.attempt.outcome === "succeeded" ? "published" : "failed",
        publishingMode: row.attempt.publishingMode as "simulated" | "live",
      }),
    }));
  }

  async dashboard(brandId?: string) {
    const items = await this.list({ brandId });
    const now = new Date();
    const start = startOfWeek(now);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
    const dated = items.filter((item) => item.scheduledAt || item.publishedAt);
    const week = days.map((date) => {
      const key = dayKey(date);
      const onDay = dated.filter((item) => dayKey(new Date(item.scheduledAt || item.publishedAt || 0)) === key);
      return {
        date: key,
        weekday: date.toLocaleDateString("en-GB", { weekday: "short" }),
        slots: onDay.length,
        failed: onDay.filter((item) => item.status === "failed").length,
      };
    });
    const scheduled = items.filter((item) => item.status === "scheduled").sort(bySchedule);
    const failed = items.filter((item) => item.status === "failed").sort(bySchedule);
    const simulatedThisWeek = items.filter((item) => {
      if (item.status !== "published" || item.publishingMode !== "simulated") return false;
      const stamp = new Date(item.publishedAt || item.scheduledAt || 0);
      return stamp >= start && stamp < addDays(start, 7);
    });
    const end = addDays(start, 6);
    return {
      banner: publishingBanner(),
      integrationsMode: process.env.INTEGRATIONS_MODE === "live" ? "live" : "mock",
      finding: finding(failed.length, scheduled[0]),
      counts: {
        scheduled: scheduled.length,
        failed: failed.length,
        simulatedThisWeek: simulatedThisWeek.length,
        windowLabel: `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      },
      next: scheduled[0] || null,
      afterNext: scheduled.slice(1, 6),
      failed: failed.slice(0, 5),
      recent: items
        .filter((item) => item.status === "published")
        .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
        .slice(0, 5),
      week,
      weekTotal: week.reduce((sum, day) => sum + day.slots, 0),
    };
  }

  private async assemble(
    rows: { post: typeof posts.$inferSelect; brandName: string; collectionName: string | null }[],
    withAttempts: boolean,
  ) {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.post.id);
    const targetRows = await this.database.db
      .select({ target: postTargets, account: socialAccounts })
      .from(postTargets)
      .innerJoin(socialAccounts, eq(socialAccounts.id, postTargets.socialAccountId))
      .where(inArray(postTargets.postId, ids));
    const mediaRows = await this.database.db
      .select({ link: postMedia, media: mediaAssets })
      .from(postMedia)
      .innerJoin(mediaAssets, eq(mediaAssets.id, postMedia.mediaId))
      .where(inArray(postMedia.postId, ids));
    const targetIds = targetRows.map((row) => row.target.id);
    const attemptRows =
      withAttempts && targetIds.length
        ? await this.database.db.select().from(publishAttempts).where(inArray(publishAttempts.postTargetId, targetIds))
        : [];

    return rows.map((row) => {
      const targets = targetRows
        .filter((item) => item.target.postId === row.post.id)
        .map((item) => ({
          id: item.target.id,
          accountId: item.account.id,
          platform: item.account.platform,
          displayName: item.account.displayName,
          handle: item.account.handle,
          connectionMode: item.account.connectionMode,
          status: item.target.status,
          publishingMode: item.target.publishingMode,
          statusLabel: statusLabel({
            status: item.target.status,
            publishingMode: item.target.publishingMode as "simulated" | "live" | null,
          }),
          summary: item.target.summary,
          externalPostId: item.target.externalPostId,
          lastError: item.target.lastError,
          attemptCount: item.target.attemptCount,
        }));
      const media = mediaRows
        .filter((item) => item.link.postId === row.post.id)
        .sort((a, b) => a.link.sortOrder - b.link.sortOrder)
        .map((item) => ({
          id: item.media.id,
          kind: item.media.kind,
          mimeType: item.media.mimeType,
          altText: item.media.altText,
          originalName: item.media.originalName,
          sample: item.media.sample,
          sortOrder: item.link.sortOrder,
          width: item.media.width,
          height: item.media.height,
        }));
      const publishingMode = (row.post.publishingMode as "simulated" | "live" | null) ?? null;
      return {
        id: row.post.id,
        brandId: row.post.brandId,
        brandName: row.brandName,
        collectionId: row.post.collectionId,
        collectionName: row.collectionName,
        title: row.post.title,
        body: row.post.body,
        format: row.post.format,
        status: row.post.status,
        publishingMode,
        statusLabel: statusLabel({ status: row.post.status, publishingMode }),
        scheduledAt: row.post.scheduledAt,
        publishedAt: row.post.publishedAt,
        accountsSimulated: targets.length === 0 || targets.every((target) => target.connectionMode === "simulated"),
        media,
        targets,
        attempts: attemptRows
          .filter((attempt) => targets.some((target) => target.id === attempt.postTargetId))
          .map((attempt) => ({
            id: attempt.id,
            postTargetId: attempt.postTargetId,
            publishingMode: attempt.publishingMode,
            simulated: attempt.simulated,
            outcome: attempt.outcome,
            summary: attempt.summary,
            errorCode: attempt.errorCode,
            externalPostId: attempt.externalPostId,
            finishedAt: attempt.finishedAt,
            statusLabel: statusLabel({
              status: attempt.outcome === "succeeded" ? "published" : "failed",
              publishingMode: attempt.publishingMode as "simulated" | "live",
            }),
          })),
      };
    });
  }

  private async ensureComposition(input: SaveInput) {
    const accountIds = input.accountIds ?? [];
    const mediaIds = input.mediaIds ?? [];
    const accounts = accountIds.length
      ? await this.database.db.select().from(socialAccounts).where(inArray(socialAccounts.id, accountIds))
      : [];
    const media = mediaIds.length
      ? await this.database.db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds))
      : [];
    const ordered = mediaIds
      .map((id) => media.find((item) => item.id === id))
      .filter((item): item is (typeof media)[number] => Boolean(item));
    const errors: string[] = [];
    if (accounts.length === 0) errors.push("Choose at least one account.");
    for (const account of accounts) {
      for (const issue of validateComposition({
        format: input.format,
        body: input.body ?? "",
        media: ordered,
        platform: account.platform,
      })) {
        errors.push(issue.message);
      }
    }
    if (errors.length) {
      throw new BadRequestException({ message: errors[0], fields: { composition: errors.join(" ") } });
    }
  }

  private async assertRelations(input: SaveInput) {
    const accountIds = input.accountIds ?? [];
    const mediaIds = input.mediaIds ?? [];
    const [brand] = await this.database.db.select().from(brands).where(eq(brands.id, input.brandId));
    if (!brand) throw new BadRequestException({ message: "Choose a brand.", fields: { brandId: "Choose a brand." } });
    if (input.collectionId) {
      const [collection] = await this.database.db
        .select()
        .from(collections)
        .where(and(eq(collections.id, input.collectionId), eq(collections.brandId, input.brandId)));
      if (!collection) {
        throw new BadRequestException({ message: "That set belongs to another brand.", fields: { collectionId: "Choose a set from this brand." } });
      }
    }
    if (accountIds.length) {
      const accounts = await this.database.db
        .select()
        .from(socialAccounts)
        .where(and(inArray(socialAccounts.id, accountIds), eq(socialAccounts.brandId, input.brandId)));
      if (accounts.length !== accountIds.length) {
        throw new BadRequestException({ message: "Choose accounts from this brand.", fields: { accountIds: "Choose accounts from this brand." } });
      }
    }
    if (mediaIds.length) {
      const media = await this.database.db
        .select()
        .from(mediaAssets)
        .where(and(inArray(mediaAssets.id, mediaIds), eq(mediaAssets.brandId, input.brandId)));
      if (media.length !== new Set(mediaIds).size) {
        throw new BadRequestException({ message: "Choose files from this brand.", fields: { mediaIds: "Choose files from this brand." } });
      }
    }
  }

  private async replaceLinks(postId: string, input: SaveInput) {
    await this.replaceMedia(postId, input.mediaIds ?? []);
    for (const accountId of input.accountIds ?? []) {
      await this.database.db.insert(postTargets).values({
        postId,
        socialAccountId: accountId,
        status: "pending",
      });
    }
  }

  private async replaceMedia(postId: string, mediaIds: string[]) {
    await this.database.db.delete(postMedia).where(eq(postMedia.postId, postId));
    for (const [index, mediaId] of mediaIds.entries()) {
      await this.database.db.insert(postMedia).values({ postId, mediaId, sortOrder: index });
    }
  }
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function bySchedule(a: { scheduledAt: Date | null }, b: { scheduledAt: Date | null }) {
  return new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime();
}

function finding(
  failed: number,
  next: { title: string; brandName: string; scheduledAt: Date | null } | undefined,
) {
  if (failed > 0) {
    return failed === 1
      ? "1 simulation failed and is still waiting."
      : `${failed} simulations failed and are still waiting.`;
  }
  if (next?.scheduledAt) {
    const when = new Date(next.scheduledAt).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Next slot is ${when} for ${next.brandName}.`;
  }
  return "Nothing is scheduled.";
}

export function publishingBanner() {
  if (process.env.INTEGRATIONS_MODE === "live") {
    return "Live providers are selected, but no network credentials are configured. SocialHub refuses those calls instead of simulating a success.";
  }
  return "Simulated publishing is on. SocialHub is not sending anything to Facebook, Instagram, LinkedIn, or TikTok.";
}
