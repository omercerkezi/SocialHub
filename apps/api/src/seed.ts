import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { resultCopy } from "@socialhub/contracts";
import * as schema from "./db/schema";
import { solidPng } from "./png";

type Database = NodePgDatabase<typeof schema>;

export function mediaRoot() {
  return process.env.STORAGE_DIR || join(process.cwd(), "storage");
}

function atOffset(dayOffset: number, hours: number, minutes: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function pastHour(hours: number, minutes: number) {
  const date = atOffset(0, hours, minutes);
  if (date.getTime() > Date.now() - 60_000) {
    return new Date(Date.now() - 2 * 60 * 60 * 1000);
  }
  return date;
}

export async function seedIfEmpty(db: Database) {
  const email = (process.env.ADMIN_EMAIL || "owner@socialhub.local").toLowerCase();
  const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existingUsers.length === 0) {
    await db.insert(schema.users).values({
      email,
      name: process.env.ADMIN_NAME || "Owner",
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "change-me", 10),
    });
  }

  const existingBrands = await db.select().from(schema.brands);
  if (existingBrands.length > 0) return;

  await mkdir(mediaRoot(), { recursive: true });

  const [furnio] = await db
    .insert(schema.brands)
    .values({
      name: "Furnio",
      slug: "furnio",
      description: "Furniture pieces and the finishes they are shown in.",
    })
    .returning();
  const [smartLeads] = await db
    .insert(schema.brands)
    .values({
      name: "Smart Leads",
      slug: "smart-leads",
      description: "Notes and follow-ups for conversations already in progress.",
    })
    .returning();

  const [showroom] = await db
    .insert(schema.collections)
    .values({ brandId: furnio.id, name: "Showroom" })
    .returning();
  const [followUps] = await db
    .insert(schema.collections)
    .values({ brandId: smartLeads.id, name: "Follow-ups" })
    .returning();

  const furnioAccounts = await connectSet(db, furnio.id, "Furnio", "furnio");
  const leadAccounts = await connectSet(db, smartLeads.id, "Smart Leads", "smartleads");

  const oak = await sampleImage(db, furnio.id, "oak-swatch.png", "Generated oak swatch for the Furnio sample set.", 196, 165, 116);
  const linen = await sampleImage(db, furnio.id, "linen-swatch.png", "Generated linen swatch for the Furnio sample set.", 231, 225, 214);
  const ink = await sampleImage(db, furnio.id, "ink-swatch.png", "Generated ink swatch for the Furnio sample set.", 36, 48, 56);
  const note = await sampleImage(db, smartLeads.id, "note-card.png", "Generated note card for the Smart Leads sample set.", 232, 238, 242);

  const publishedImageAt = atOffset(-3, 10, 0);
  const publishedNoteAt = atOffset(-2, 9, 30);
  const failedAt = pastHour(8, 5);
  const carouselAt = atOffset(1, 9, 0);
  const introAt = atOffset(3, 11, 0);

  await insertPost(db, {
    brandId: furnio.id,
    collectionId: showroom.id,
    title: "Oak bench, north light",
    body: "The oak bench in the north light of the showroom. This file is a generated swatch, not a photograph of the bench.",
    format: "image",
    status: "published",
    when: publishedImageAt,
    published: true,
    media: [oak],
    accounts: [furnioAccounts.facebook, furnioAccounts.instagram],
    fail: false,
  });

  await insertPost(db, {
    brandId: smartLeads.id,
    collectionId: followUps.id,
    title: "Same-day follow-up",
    body: "Write the follow-up the day the conversation happened. One question, and one next step.",
    format: "text",
    status: "published",
    when: publishedNoteAt,
    published: true,
    media: [],
    accounts: [leadAccounts.linkedin],
    fail: false,
  });

  await insertPost(db, {
    brandId: smartLeads.id,
    collectionId: followUps.id,
    title: "Tuesday list",
    body: "The Tuesday list is still open. This sample attempt failed inside the simulator so the desk has something to retry.",
    format: "text",
    status: "failed",
    when: failedAt,
    published: false,
    media: [],
    accounts: [leadAccounts.linkedin],
    fail: true,
  });

  await insertPost(db, {
    brandId: furnio.id,
    collectionId: showroom.id,
    title: "Finish comparison",
    body: "Oak, linen, and the dark stain, side by side. Sample swatches only.",
    format: "carousel",
    status: "scheduled",
    when: carouselAt,
    published: false,
    media: [oak, linen, ink],
    accounts: [furnioAccounts.instagram],
    fail: false,
    pending: true,
  });

  await insertPost(db, {
    brandId: smartLeads.id,
    collectionId: followUps.id,
    title: "Intro note",
    body: "A single card for the people who asked what Smart Leads actually sends.",
    format: "image",
    status: "scheduled",
    when: introAt,
    published: false,
    media: [note],
    accounts: [leadAccounts.facebook],
    fail: false,
    pending: true,
  });

  await db.insert(schema.posts).values({
    brandId: furnio.id,
    collectionId: showroom.id,
    title: "Bench detail",
    body: "A short walk around the bench. Add a video before simulating this Reel.",
    format: "reel",
    status: "draft",
  });
}

async function connectSet(db: Database, brandId: string, displayName: string, handle: string) {
  const platforms = ["facebook", "instagram", "linkedin", "tiktok"] as const;
  const accounts: Record<string, { id: string; platform: string }> = {};
  for (const platform of platforms) {
    const [account] = await db
      .insert(schema.socialAccounts)
      .values({
        brandId,
        platform,
        displayName,
        handle,
        externalId: `sim_${platform}_${handle}`,
        connectionMode: "simulated",
        status: "connected",
        connectedAt: new Date(),
      })
      .returning();
    accounts[platform] = account;
  }
  return accounts;
}

async function sampleImage(
  db: Database,
  brandId: string,
  name: string,
  altText: string,
  r: number,
  g: number,
  b: number,
) {
  const png = solidPng(64, 64, r, g, b);
  const [asset] = await db
    .insert(schema.mediaAssets)
    .values({
      brandId,
      kind: "image",
      originalName: name,
      mimeType: "image/png",
      byteSize: png.length,
      width: 64,
      height: 64,
      storageKey: "",
      altText,
      sample: true,
    })
    .returning();
  const storageKey = `${asset.id}.png`;
  await writeFile(join(mediaRoot(), storageKey), png);
  await db.update(schema.mediaAssets).set({ storageKey }).where(eq(schema.mediaAssets.id, asset.id));
  return asset.id;
}

async function insertPost(
  db: Database,
  input: {
    brandId: string;
    collectionId: string;
    title: string;
    body: string;
    format: string;
    status: string;
    when: Date;
    published: boolean;
    media: string[];
    accounts: { id: string; platform: string }[];
    fail: boolean;
    pending?: boolean;
  },
) {
  const [post] = await db
    .insert(schema.posts)
    .values({
      brandId: input.brandId,
      collectionId: input.collectionId,
      title: input.title,
      body: input.body,
      format: input.format,
      status: input.status,
      publishingMode: input.pending ? null : "simulated",
      scheduledAt: input.when,
      publishedAt: input.published ? input.when : null,
    })
    .returning();

  for (const [index, mediaId] of input.media.entries()) {
    await db.insert(schema.postMedia).values({ postId: post.id, mediaId, sortOrder: index });
  }

  for (const account of input.accounts) {
    const summary = input.pending
      ? null
      : resultCopy({
          publishingMode: "simulated",
          ok: !input.fail,
          platform: account.platform,
          errorMessage: input.fail
            ? `Simulated failure. Nothing was sent to the network. This sample was recorded as a failed attempt.`
            : undefined,
        });
    const [target] = await db
      .insert(schema.postTargets)
      .values({
        postId: post.id,
        socialAccountId: account.id,
        status: input.pending ? "scheduled" : input.fail ? "failed" : "published",
        publishingMode: input.pending ? null : "simulated",
        externalPostId: input.pending || input.fail ? null : `sim_${account.platform}_sample`,
        lastError: input.fail ? summary : null,
        summary,
        attemptCount: input.pending ? 0 : 1,
      })
      .returning();

    if (!input.pending && summary) {
      await db.insert(schema.publishAttempts).values({
        postTargetId: target.id,
        publishingMode: "simulated",
        simulated: true,
        outcome: input.fail ? "failed" : "succeeded",
        errorCode: input.fail ? "simulated_failure" : null,
        errorMessage: input.fail ? summary : null,
        summary,
        externalPostId: input.pending || input.fail ? null : `sim_${account.platform}_sample`,
        startedAt: input.when,
        finishedAt: input.when,
      });
    }
  }
}
