import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
import { ACCESS_KEY } from "./auth-cookie";
import { SessionService } from "../../modules/auth/session.service";

export type AuthenticatedRequest = Request & {
  auth?: {
    userId: bigint;
  };
};

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext<{ req: AuthenticatedRequest }>().req;

    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException();

    const userId = await this.sessionService.verifyAccessToken(token);
    if (!userId) throw new UnauthorizedException();

    req.auth = { userId };

    return true;
  }

  private extractToken(request: Request): string | null {
    const authorization = request.get("authorization");

    if (authorization !== undefined) {
      const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
      return match?.[1] ?? null;
    }

    const cookieToken = request.cookies?.[ACCESS_KEY];

    return typeof cookieToken === "string" && cookieToken.length > 0
      ? cookieToken
      : null;
  }
}
