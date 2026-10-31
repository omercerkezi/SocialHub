import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DatabaseService } from "../db/database.service";
import { users } from "../db/schema";
import { AuthGuard } from "./auth.guard";
import { parseBody } from "../parse";

const loginSchema = z.object({
  email: z.string().email("Enter the email address you sign in with."),
  password: z.string().min(1, "Enter your password."),
});

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  @Post("login")
  async login(@Body() body: unknown) {
    const input = parseBody(loginSchema, body);
    const [user] = await this.database.db.select().from(users).where(eq(users.email, input.email.toLowerCase()));
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("That email and password do not match.");
    }
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() request: { user: { sub: string } }) {
    const [user] = await this.database.db.select().from(users).where(eq(users.id, request.user.sub));
    if (!user) throw new UnauthorizedException("Sign in again. This session has ended.");
    return { id: user.id, email: user.email, name: user.name };
  }
}
