import { Resolver, Query } from "@nestjs/graphql";
import { ProductService } from "../../modules/catalog/product.service";
import { Product } from "./product.type";
import { toProduct } from "./product.mapper";

@Resolver()
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Query(() => [Product])
  async products() {
    const rows = await this.productService.findMany();

    return rows.map(toProduct);
  }
}
