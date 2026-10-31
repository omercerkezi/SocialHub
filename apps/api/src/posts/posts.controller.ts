import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard } from "../auth/auth.guard";
import { parseBody } from "../parse";
import { PublishingService } from "../publishing/publishing.service";
import { PostsService } from "./posts.service";

const saveSchema = z.object({
  brandId: z.string().uuid("Choose a brand."),
  collectionId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Name the post.").max(140, "Keep the name under 140 characters."),
  body: z.string().default(""),
  format: z.enum(["text", "image", "carousel", "video", "reel"]),
  mediaIds: z.array(z.string().uuid()).default([]),
  accountIds: z.array(z.string().uuid()).default([]),
});

const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, "Choose a date and time."),
});

@Controller()
@UseGuards(AuthGuard)
export class PostsController {
  constructor(
    @Inject(PostsService) private readonly posts: PostsService,
    @Inject(PublishingService) private readonly publishing: PublishingService,
  ) {}

  @Get("posts")
  list(@Query("brandId") brandId?: string, @Query("status") status?: string, @Query("collectionId") collectionId?: string) {
    return this.posts.list({ brandId, status, collectionId });
  }

  @Post("posts")
  create(@Body() body: unknown) {
    return this.posts.create(parseBody(saveSchema, body));
  }

  @Get("posts/:id")
  view(@Param("id") id: string) {
    return this.posts.view(id);
  }

  @Patch("posts/:id")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.posts.update(id, parseBody(saveSchema, body));
  }

  @Delete("posts/:id")
  remove(@Param("id") id: string) {
    return this.posts.remove(id);
  }

  @Post("posts/:id/duplicate")
  duplicate(@Param("id") id: string) {
    return this.posts.duplicate(id);
  }

  @Post("posts/:id/schedule")
  async schedule(@Param("id") id: string, @Body() body: unknown) {
    const input = parseBody(scheduleSchema, body);
    await this.publishing.schedule(id, new Date(input.scheduledAt));
    return this.posts.view(id);
  }

  @Post("posts/:id/publish")
  async publish(@Param("id") id: string) {
    await this.publishing.publishNow(id);
    return this.posts.view(id);
  }

  @Post("posts/:id/cancel")
  async cancel(@Param("id") id: string) {
    await this.publishing.cancel(id);
    return this.posts.view(id);
  }

  @Post("posts/:id/retry")
  async retry(@Param("id") id: string) {
    await this.publishing.retry(id);
    return this.posts.view(id);
  }

  @Get("calendar")
  calendar(@Query("from") from?: string, @Query("to") to?: string, @Query("brandId") brandId?: string) {
    const start = from ? new Date(from) : startOfWeek(new Date());
    const end = to ? new Date(to) : addDays(start, 7);
    return this.posts.calendar(start, end, brandId);
  }

  @Get("dashboard")
  dashboard(@Query("brandId") brandId?: string) {
    return this.posts.dashboard(brandId);
  }

  @Get("history")
  history(@Query("brandId") brandId?: string) {
    return this.posts.history(brandId);
  }
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
