import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { User } from "./user.type";
import {
  LoginPayload,
  LogoutPayload,
  RefreshPayload,
  RegisterPayload,
} from "./auth.type";
import { RegisterInput, LoginInput } from "./auth.input";
import { UserService } from "../../modules/user/user.service";
import { SessionService } from "../../modules/auth/session.service";
import { toUser } from "./user.mapper";
import { Context } from "@nestjs/graphql";
import { clearAuthCookies, REFRESH_KEY, setAuthCookies } from "./auth-cookie";
import type { Request, Response } from "express";
import { ErrorCode } from "../../common/errors/error-code";

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  @Mutation(() => RegisterPayload)
  async register(
    @Args("input") input: RegisterInput,
    @Context("res") response: Response,
  ): Promise<RegisterPayload> {
    const res = await this.userService.register(
      input.email,
      input.password,
      input.displayName,
    );

    if (res.ok) {
      const pair = await this.sessionService.createTokenPair(res.user.id);
      setAuthCookies(response, pair);

      return {
        data: {
          user: toUser(res.user),
        },
        errors: [],
      };
    }

    return {
      errors: [{ code: res.code, message: "Email is already registered" }],
    };
  }

  @Mutation(() => LoginPayload)
  async login(
    @Args("input") input: LoginInput,
    @Context("res") response: Response,
  ): Promise<LoginPayload> {
    const res = await this.userService.login(input.email, input.password);

    if (res.ok) {
      const pair = await this.sessionService.createTokenPair(res.user.id);
      setAuthCookies(response, pair);

      return {
        data: {
          user: toUser(res.user),
        },
        errors: [],
      };
    }

    return {
      errors: [{ code: res.code, message: "Invalid credentials" }],
    };
  }

  @Mutation(() => RefreshPayload)
  async refresh(
    @Context("res") response: Response,
    @Context("req") request: Request,
  ): Promise<RefreshPayload> {
    const refreshToken = request.cookies?.[REFRESH_KEY];

    const failedPath = () => {
      clearAuthCookies(response);
      return {
        errors: [
          {
            code: ErrorCode.INVALID_REFRESH_TOKEN,
            message: "Invalid refresh token",
          },
        ],
      };
    };

    if (typeof refreshToken !== "string" || !refreshToken) {
      return failedPath();
    }

    const res = await this.sessionService.rotateRefreshToken(refreshToken);

    if (res) {
      setAuthCookies(response, res);

      return {
        data: {
          refreshed: true,
        },
        errors: [],
      };
    }

    return failedPath();
  }

  @Mutation(() => LogoutPayload)
  async logout(
    @Context("req") request: Request,
    @Context("res") response: Response,
  ): Promise<LogoutPayload> {
    const refreshToken = request.cookies?.[REFRESH_KEY];

    try {
      if (typeof refreshToken === "string" && refreshToken) {
        await this.sessionService.revokeRefreshToken(refreshToken);
      }
    } finally {
      clearAuthCookies(response);
    }

    return {
      data: {
        loggedOut: true,
      },
      errors: [],
    };
  }
}
