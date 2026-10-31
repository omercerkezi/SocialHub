import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";
import { LIMITS, PLATFORMS } from "@socialhub/contracts";
import { DatabaseService } from "../db/database.service";
import { brands, collections, mediaAssets, postMedia, socialAccounts } from "../db/schema";
import { liveProvider, mockProvider } from "../integrations/providers";
import { mediaRoot } from "../seed";
import { publishingBanner } from "../posts/posts.service";

const IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);

@Injectable()
export class WorkspaceService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async brands() {
    return this.database.db.select().from(brands).orderBy(brands.name);
  }

  async createBrand(name: string, description: string) {
    const slug = await this.uniqueSlug(name);
    const [brand] = await this.database.db.insert(brands).values({ name: name.trim(), slug, description }).returning();
    return brand;
  }

  async updateBrand(id: string, name: string, description: string) {
    const [brand] = await this.database.db
      .update(brands)
      .set({ name: name.trim(), description, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    if (!brand) throw new NotFoundException("That brand is not on the desk.");
    return brand;
  }

  async deleteBrand(id: string) {
    const assets = await this.database.db.select().from(mediaAssets).where(eq(mediaAssets.brandId, id));
    const deleted = await this.database.db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id });
    if (deleted.length === 0) throw new NotFoundException("That brand is not on the desk.");
    await Promise.all(assets.map((asset) => rm(join(mediaRoot(), asset.storageKey), { force: true })));
    return { deleted: true };
  }

  async accounts(brandId?: string) {
    return this.database.db
      .select()
      .from(socialAccounts)
      .where(brandId ? eq(socialAccounts.brandId, brandId) : undefined as never)
      .orderBy(socialAccounts.platform);
  }

  async connect(brandId: string, input: { platform: string; displayName: string; handle: string; connectionMode?: string }) {
    const [brand] = await this.database.db.select().from(brands).where(eq(brands.id, brandId));
    if (!brand) throw new NotFoundException("That brand is not on the desk.");
    if (!PLATFORMS.includes(input.platform)) {
      throw new BadRequestException({ message: "Choose Facebook, Instagram, LinkedIn, or TikTok.", fields: { platform: "Choose a network." } });
    }
    if (input.connectionMode === "live") {
      throw new BadRequestException({ message: liveProvider.connect(input.platform).summary });
    }
    const connected = await mockProvider.connect(input.platform, input.displayName.trim(), input.handle.trim());
    const [account] = await this.database.db
      .insert(socialAccounts)
      .values({
        brandId,
        platform: input.platform,
        displayName: input.displayName.trim(),
        handle: input.handle.replace(/^@/, "").trim(),
        externalId: connected.externalId,
        connectionMode: "simulated",
        status: "connected",
        connectedAt: new Date(),
      })
      .returning();
    return { ...account, summary: connected.summary, publishingMode: "simulated" as const, simulated: true };
  }

  async disconnect(id: string) {
    const [account] = await this.database.db
      .update(socialAccounts)
      .set({ status: "disconnected", updatedAt: new Date() })
      .where(eq(socialAccounts.id, id))
      .returning();
    if (!account) throw new NotFoundException("That account is not on the desk.");
    return account;
  }

  async setFailure(id: string, enabled: boolean) {
    const [existing] = await this.database.db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
    if (!existing) throw new NotFoundException("That account is not on the desk.");
    if (existing.connectionMode === "live") {
      throw new BadRequestException({ message: "Failure simulation applies to simulated accounts only." });
    }
    const [account] = await this.database.db
      .update(socialAccounts)
      .set({ simulateNextFailure: enabled, updatedAt: new Date() })
      .where(eq(socialAccounts.id, id))
      .returning();
    return account;
  }

  async collections(brandId?: string) {
    return this.database.db
      .select()
      .from(collections)
      .where(brandId ? eq(collections.brandId, brandId) : undefined as never)
      .orderBy(collections.name);
  }

  async createCollection(brandId: string, name: string) {
    const [brand] = await this.database.db.select().from(brands).where(eq(brands.id, brandId));
    if (!brand) throw new NotFoundException("That brand is not on the desk.");
    const [collection] = await this.database.db.insert(collections).values({ brandId, name: name.trim() }).returning();
    return collection;
  }

  async deleteCollection(id: string) {
    const deleted = await this.database.db.delete(collections).where(eq(collections.id, id)).returning({ id: collections.id });
    if (deleted.length === 0) throw new NotFoundException("That set is not on the desk.");
    return { deleted: true };
  }

  async media(brandId?: string) {
    return this.database.db
      .select()
      .from(mediaAssets)
      .where(brandId ? eq(mediaAssets.brandId, brandId) : undefined as never)
      .orderBy(mediaAssets.createdAt);
  }

  async saveMedia(file: { originalname?: string; mimetype: string; size: number; buffer: Buffer } | undefined, brandId: string, altText: string) {
    if (!file) throw new BadRequestException({ message: "Choose a file.", fields: { file: "Choose a file." } });
    if (!/^[0-9a-f-]{36}$/i.test(brandId)) {
      throw new BadRequestException({ message: "Choose a brand.", fields: { brandId: "Choose a brand." } });
    }
    const [brand] = await this.database.db.select().from(brands).where(eq(brands.id, brandId));
    if (!brand) throw new NotFoundException("That brand is not on the desk.");
    const kind = IMAGE.has(file.mimetype) ? "image" : VIDEO.has(file.mimetype) ? "video" : null;
    if (!kind) {
      throw new BadRequestException({
        message: "Use a JPEG, PNG, WebP, GIF, MP4, WebM, or QuickTime file.",
        fields: { file: "That file type is not in the library." },
      });
    }
    await mkdir(mediaRoot(), { recursive: true });
    const [asset] = await this.database.db
      .insert(mediaAssets)
      .values({
        brandId,
        kind,
        originalName: file.originalname || "upload",
        mimeType: file.mimetype,
        byteSize: file.size,
        storageKey: "pending",
        altText: altText.trim(),
        sample: false,
      })
      .returning();
    const storageKey = `${asset.id}`;
    await writeFile(join(mediaRoot(), storageKey), file.buffer);
    const [saved] = await this.database.db
      .update(mediaAssets)
      .set({ storageKey })
      .where(eq(mediaAssets.id, asset.id))
      .returning();
    return saved;
  }

  async mediaFile(id: string) {
    const [asset] = await this.database.db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    if (!asset) throw new NotFoundException("That file is not in the library.");
    const buffer = await readFile(join(mediaRoot(), asset.storageKey));
    return { asset, buffer };
  }

  async deleteMedia(id: string) {
    const used = await this.database.db.select().from(postMedia).where(eq(postMedia.mediaId, id));
    if (used.length) {
      throw new BadRequestException({ message: "Remove this file from its posts before deleting it." });
    }
    const [asset] = await this.database.db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
    if (!asset) throw new NotFoundException("That file is not in the library.");
    await rm(join(mediaRoot(), asset.storageKey), { force: true });
    return { deleted: true };
  }

  integrations() {
    return {
      mode: process.env.INTEGRATIONS_MODE === "live" ? "live" : "mock",
      banner: publishingBanner(),
      providers: PLATFORMS.map((platform) => ({
        platform,
        activeMode: "simulated",
        liveCredentials: false,
        formats: LIMITS[platform].formats,
        note: "Live calls are refused until credentials exist. A refusal is not recorded as a simulated success.",
      })),
    };
  }

  private async uniqueSlug(name: string) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
    let slug = base;
    let n = 2;
    while ((await this.database.db.select().from(brands).where(eq(brands.slug, slug))).length) {
      slug = `${base}-${n}`;
      n += 1;
    }
    return slug;
  }
}
