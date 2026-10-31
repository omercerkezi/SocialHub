import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; query: { token?: string }; user?: { sub: string; email: string } }>();
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : request.query.token;
    if (!token) throw new UnauthorizedException("Sign in to continue.");
    try {
      request.user = this.jwt.verify<{ sub: string; email: string }>(token);
      return true;
    } catch {
      throw new UnauthorizedException("Sign in again. This session has ended.");
    }
  }
}
