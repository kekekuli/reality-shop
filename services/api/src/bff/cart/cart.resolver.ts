import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  AddCartItemPayload,
  CartType,
  RemoveCartItemPayload,
  UpdateCartItemQuantityPayload,
} from "./cart.type";
import { CartService } from "../../modules/cart/cart.service";
import { UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, GqlAuthGuard } from "../user/gql-auth.guard";
import {
  AddCartItemInput,
  RemoveCartItemInput,
  UpdateCartItemQuantityInput,
} from "./cart.input";
import { toCartItemType } from "./cart.mapper";
import { ErrorCode } from "../../common/errors/error-code";

function parseSkuId(value: string): bigint | null {
  try {
    const skuId = BigInt(value);
    return skuId > 0n ? skuId : null;
  } catch {
    return null;
  }
}

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

    const skuId = parseSkuId(input.skuId);
    if (skuId === null) {
      return {
        errors: [
          {
            code: ErrorCode.SKU_NOT_FOUND,
          },
        ],
      };
    }

    const res = await this.cartService.addItem(userId, skuId, input.quantity);

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

  @Query(() => CartType)
  @UseGuards(GqlAuthGuard)
  async cart(@Context("req") request: AuthenticatedRequest): Promise<CartType> {
    const userId = request.auth!.userId;
    const items = await this.cartService.listItems(userId);

    return {
      items: items.map(toCartItemType),
    };
  }

  @Mutation(() => UpdateCartItemQuantityPayload)
  @UseGuards(GqlAuthGuard)
  async updateCartItemQuantity(
    @Args("input") input: UpdateCartItemQuantityInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<UpdateCartItemQuantityPayload> {
    const skuId = parseSkuId(input.skuId);
    if (skuId === null) {
      return { errors: [{ code: ErrorCode.CART_ITEM_NOT_FOUND }] };
    }

    const result = await this.cartService.updateItemQuantity(
      request.auth!.userId,
      skuId,
      input.quantity,
    );

    return result.ok
      ? { data: toCartItemType(result.cartItem), errors: [] }
      : { errors: [{ code: result.errCode }] };
  }

  @Mutation(() => RemoveCartItemPayload)
  @UseGuards(GqlAuthGuard)
  async removeCartItem(
    @Args("input") input: RemoveCartItemInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<RemoveCartItemPayload> {
    const skuId = parseSkuId(input.skuId);
    if (skuId === null) {
      return {
        errors: [{ code: ErrorCode.SKU_NOT_FOUND }],
      };
    }

    await this.cartService.removeItem(request.auth!.userId, skuId);

    return {
      data: { skuId: skuId.toString() },
      errors: [],
    };
  }
}
