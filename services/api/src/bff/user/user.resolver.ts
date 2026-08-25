import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { User } from "./user.type";
import { RegisterPayload } from "./auth.type";
import { RegisterInput } from "./auth.input";
import { UserService } from "../../modules/user/user.service";
import { SessionService } from "../../modules/auth/session.service";
import { toUser } from "./user.mapper";
import { Context } from "@nestjs/graphql";
import { setAuthCookies } from "./auth-cookie";
import type { Response } from "express";

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
}
