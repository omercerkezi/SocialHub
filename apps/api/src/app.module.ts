import "./env";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth/auth.controller";
import { AuthGuard } from "./auth/auth.guard";
import { DatabaseService } from "./db/database.service";
import { PostsController } from "./posts/posts.controller";
import { PostsService } from "./posts/posts.service";
import { PublishingService } from "./publishing/publishing.service";
import { SystemController } from "./system.controller";
import { WorkspaceController } from "./workspace/workspace.controller";
import { WorkspaceService } from "./workspace/workspace.service";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "dev-only-change-me",
      signOptions: { expiresIn: "30d" },
    }),
  ],
  controllers: [AuthController, WorkspaceController, PostsController, SystemController],
  providers: [DatabaseService, AuthGuard, WorkspaceService, PostsService, PublishingService],
})
export class AppModule {}
