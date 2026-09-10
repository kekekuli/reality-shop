import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import type DataLoader from "dataloader";
import { AddCartItemPayload, CartItemType, CartType } from "./cart.type";
import { CartService } from "../../modules/cart/cart.service";
import { UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, GqlAuthGuard } from "../user/gql-auth.guard";
import { AddCartItemInput } from "./cart.input";
import { toCartItemType } from "./cart.mapper";
import { ErrorCode } from "../../common/errors/error-code";
import { Sku } from "../catalog/sku.type";
import type { Sku as PrismaSku } from "../../generated/prisma/client";
import { toSku } from "../catalog/sku.mapper";

@Resolver(() => CartItemType)
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

  @ResolveField(() => Sku)
  async sku(
    @Parent() item: CartItemType,
    @Context("skuByIdLoader") loader: DataLoader<bigint, PrismaSku>,
  ): Promise<Sku> {
    return toSku(await loader.load(BigInt(item.skuId)));
  }
}
