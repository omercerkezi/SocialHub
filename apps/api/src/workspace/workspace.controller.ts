import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { z } from "zod";
import { AuthGuard } from "../auth/auth.guard";
import { parseBody } from "../parse";
import { WorkspaceService } from "./workspace.service";

const brandSchema = z.object({
  name: z.string().trim().min(1, "Name the brand.").max(80),
  description: z.string().default(""),
});

const accountSchema = z.object({
  platform: z.string(),
  displayName: z.string().trim().min(1, "Name the account."),
  handle: z.string().trim().min(1, "Add the handle."),
  connectionMode: z.enum(["simulated", "live"]).optional(),
});

const failureSchema = z.object({ enabled: z.boolean() });
const collectionSchema = z.object({
  brandId: z.string().uuid("Choose a brand."),
  name: z.string().trim().min(1, "Name the set.").max(80),
});

@Controller()
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  @Get("brands")
  brands() {
    return this.workspace.brands();
  }

  @Post("brands")
  createBrand(@Body() body: unknown) {
    const input = parseBody(brandSchema, body);
    return this.workspace.createBrand(input.name, input.description ?? "");
  }

  @Patch("brands/:id")
  updateBrand(@Param("id") id: string, @Body() body: unknown) {
    const input = parseBody(brandSchema, body);
    return this.workspace.updateBrand(id, input.name, input.description ?? "");
  }

  @Delete("brands/:id")
  deleteBrand(@Param("id") id: string) {
    return this.workspace.deleteBrand(id);
  }

  @Get("accounts")
  accounts(@Query("brandId") brandId?: string) {
    return this.workspace.accounts(brandId);
  }

  @Post("brands/:brandId/accounts")
  connect(@Param("brandId") brandId: string, @Body() body: unknown) {
    return this.workspace.connect(brandId, parseBody(accountSchema, body));
  }

  @Post("accounts/:id/disconnect")
  disconnect(@Param("id") id: string) {
    return this.workspace.disconnect(id);
  }

  @Post("accounts/:id/failure")
  failure(@Param("id") id: string, @Body() body: unknown) {
    const input = parseBody(failureSchema, body);
    return this.workspace.setFailure(id, input.enabled);
  }

  @Get("collections")
  collections(@Query("brandId") brandId?: string) {
    return this.workspace.collections(brandId);
  }

  @Post("collections")
  createCollection(@Body() body: unknown) {
    const input = parseBody(collectionSchema, body);
    return this.workspace.createCollection(input.brandId, input.name);
  }

  @Delete("collections/:id")
  deleteCollection(@Param("id") id: string) {
    return this.workspace.deleteCollection(id);
  }

  @Get("media")
  media(@Query("brandId") brandId?: string) {
    return this.workspace.media(brandId);
  }

  @Post("media")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 200 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: { originalname?: string; mimetype: string; size: number; buffer: Buffer },
    @Body() body: { brandId?: string; altText?: string },
  ) {
    return this.workspace.saveMedia(file, body.brandId || "", body.altText || "");
  }

  @Get("media/:id/file")
  async file(@Param("id") id: string, @Res() response: Response) {
    const { asset, buffer } = await this.workspace.mediaFile(id);
    response.setHeader("Content-Type", asset.mimeType);
    response.setHeader("Content-Length", buffer.length);
    response.setHeader("Cache-Control", "private, max-age=3600");
    response.setHeader("Content-Disposition", `inline; filename="${asset.originalName.replace(/"/g, "")}"`);
    response.send(buffer);
  }

  @Delete("media/:id")
  deleteMedia(@Param("id") id: string) {
    return this.workspace.deleteMedia(id);
  }

  @Get("integrations")
  integrations() {
    return this.workspace.integrations();
  }
}
