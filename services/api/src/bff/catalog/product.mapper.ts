import { Product } from "./product.type";
import { Product as PrismaProduct } from "../../generated/prisma/client";

export function toProduct(p: PrismaProduct): Product {
  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    status: p.status,
  };
}
