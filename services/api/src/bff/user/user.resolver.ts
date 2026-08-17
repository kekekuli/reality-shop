import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { User } from "./user.type";
import { RegisterPayload } from "./auth.type";
import { RegisterInput } from "./auth.input";
import { UserService } from "../../modules/user/user.service";
import { toUser } from "./user.mapper";

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => RegisterPayload)
  async register(
    @Args("input") input: RegisterInput,
  ): Promise<RegisterPayload> {
    const res = await this.userService.register(
      input.email,
      input.password,
      input.displayName,
    );

    if (res.ok) {
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
