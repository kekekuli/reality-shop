import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { AddCartItemPayload } from "./cart.type";
import { CartService } from "../../modules/cart/cart.service";
import { UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, GqlAuthGuard } from "../user/gql-auth.guard";
import { AddCartItemInput } from "./cart.input";
import { toCartItemType } from "./cart.mapper";
import { ErrorCode } from "../../common/errors/error-code";

@Resolver()
export class CartResolver {
  constructor(private readonly cartService: CartService) {}

  @Mutation(() => AddCartItemPayload)
  @UseGuards(GqlAuthGuard)
  async addCartItem(
    @Args("input") input: AddCartItemInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<AddCartItemPayload> {
    const userId = request.auth!.userId;

    let skuId: bigint;
    try {
      skuId = BigInt(input.skuId);
      if (skuId <= 0n) throw new Error();
    } catch {
      return {
        errors: [
          {
            code: ErrorCode.SKU_NOT_FOUND,
          },
        ],
      };
    }

    const res = await this.cartService.addUserItem(
      userId,
      skuId,
      input.quantity,
    );

    if (res.ok) {
      return {
        data: toCartItemType(res.cartItem),
        errors: [],
      };
    }

    return {
      errors: [{ code: res.errCode }],
    };
  }
}
