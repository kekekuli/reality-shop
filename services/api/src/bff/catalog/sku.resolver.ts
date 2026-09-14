import { Context, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type DataLoader from "dataloader";
import type { Product as PrismaProduct } from "../../generated/prisma/client";
import { toProduct } from "./product.mapper";
import { Product } from "./product.type";
import { Sku } from "./sku.type";

@Resolver(() => Sku)
export class SkuResolver {
  @ResolveField(() => Product)
  async product(
    @Parent() sku: Sku,
    @Context("productByIdLoader")
    loader: DataLoader<bigint, PrismaProduct>,
  ): Promise<Product> {
    return toProduct(await loader.load(BigInt(sku.productId)));
  }
}
