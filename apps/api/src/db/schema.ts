import { boolean, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamps.createdAt,
});

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  ...timestamps,
});

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamps.createdAt,
});

export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  displayName: text("display_name").notNull(),
  handle: text("handle").notNull(),
  externalId: text("external_id").notNull(),
  connectionMode: text("connection_mode").notNull(),
  status: text("status").notNull(),
  simulateNextFailure: boolean("simulate_next_failure").notNull().default(false),
  connectedAt: timestamp("connected_at", { withTimezone: true, mode: "date" }),
  ...timestamps,
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  storageKey: text("storage_key").notNull(),
  altText: text("alt_text").notNull().default(""),
  sample: boolean("sample").notNull().default(false),
  createdAt: timestamps.createdAt,
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  format: text("format").notNull(),
  status: text("status").notNull(),
  publishingMode: text("publishing_mode"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  ...timestamps,
});

export const postMedia = pgTable(
  "post_media",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.mediaId] })],
);

export const postTargets = pgTable("post_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  socialAccountId: uuid("social_account_id")
    .notNull()
    .references(() => socialAccounts.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  publishingMode: text("publishing_mode"),
  externalPostId: text("external_post_id"),
  lastError: text("last_error"),
  summary: text("summary"),
  attemptCount: integer("attempt_count").notNull().default(0),
  updatedAt: timestamps.updatedAt,
});

export const publishAttempts = pgTable("publish_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  postTargetId: uuid("post_target_id")
    .notNull()
    .references(() => postTargets.id, { onDelete: "cascade" }),
  publishingMode: text("publishing_mode").notNull(),
  simulated: boolean("simulated").notNull(),
  outcome: text("outcome").notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  summary: text("summary").notNull(),
  externalPostId: text("external_post_id"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }).notNull(),
});
