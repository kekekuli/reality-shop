import {
  Resolver,
  Query,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from "@nestjs/graphql";
import type DataLoader from "dataloader";
import { ProductService } from "../../modules/catalog/product.service";
import { ProductConnection, Product } from "./product.type";
import { Sku } from "./sku.type";
import { decodeCursor, encodeCursor } from "../../common/graphql/cursor";
import { toProduct } from "./product.mapper";
import { toSku } from "./sku.mapper";
import type { Sku as PrismaSku } from "../../generated/prisma/client";

@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Query(() => ProductConnection)
  async products(
    @Args("first", {
      type: () => Int,
      defaultValue: 20,
    })
    first: number,
    @Args("after", {
      type: () => String,
      nullable: true,
    })
    after?: string,
  ): Promise<ProductConnection> {
    const take = Math.min(first, 100);
    const cursor = after ? decodeCursor(after) : undefined;

    const rows = await this.productService.findPage({
      first: take,
      cursor,
    });

    const hasNextPage = rows.length > take;
    const pageRows = hasNextPage ? rows.slice(0, take) : rows;

    const edges = pageRows.map((row) => ({
      node: toProduct(row),
      cursor: encodeCursor(row.createdAt, row.id),
    }));

    const endCursor =
      edges.length > 0 ? edges[edges.length - 1].cursor : undefined;

    return {
      edges,
      pageInfo: {
        hasNextPage,
        endCursor,
      },
    };
  }

  @ResolveField(() => [Sku])
  async skus(
    @Parent() product: Product,
    @Context("skusLoader") skusLoader: DataLoader<bigint, PrismaSku[]>,
  ): Promise<Sku[]> {
    const rows = await skusLoader.load(BigInt(product.id));
    return rows.map(toSku);
  }
}
