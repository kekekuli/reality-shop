import DataLoader from "dataloader";
import type { Product as PrismaProduct } from "../../generated/prisma/client";
import { ProductService } from "../../modules/catalog/product.service";

export function createProductByIdLoader(productService: ProductService) {
  return new DataLoader<bigint, PrismaProduct>(async (ids) => {
    const products = await productService.findByIds([...ids]);
    const byId = new Map(products.map((product) => [product.id, product]));

    return ids.map(
      (id) => byId.get(id) ?? new Error(`Product ${id.toString()} not found`),
    );
  });
}
