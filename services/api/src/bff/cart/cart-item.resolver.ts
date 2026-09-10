import { Context, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type DataLoader from "dataloader";
import type { Sku as PrismaSku } from "../../generated/prisma/client";
import { toSku } from "../catalog/sku.mapper";
import { Sku } from "../catalog/sku.type";
import { CartItemType } from "./cart.type";

@Resolver(() => CartItemType)
export class CartItemResolver {
  @ResolveField(() => Sku)
  async sku(
    @Parent() item: CartItemType,
    @Context("skuByIdLoader") loader: DataLoader<bigint, PrismaSku>,
  ): Promise<Sku> {
    return toSku(await loader.load(BigInt(item.skuId)));
  }
}
