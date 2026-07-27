import { Resolver, Query, Args, Int } from "@nestjs/graphql";
import { ProductService } from "../../modules/catalog/product.service";
import { ProductConnection } from "./product.type";
import { decodeCursor, encodeCursor } from "../../common/graphql/cursor";
import { toProduct } from "./product.mapper";

@Resolver()
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
}
