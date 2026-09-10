import { describe, expect, it, vi } from "vitest";
import type { Product as PrismaProduct } from "../../generated/prisma/client";
import type { ProductService } from "../../modules/catalog/product.service";
import { createProductByIdLoader } from "./product.loader";

function product(id: bigint): PrismaProduct {
  return {
    id,
    categoryId: 1n,
    slug: `product-${id.toString()}`,
    title: `Product ${id.toString()}`,
    brand: "Reality",
    attrs: {},
    status: "on_sale",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("createProductByIdLoader", () => {
  it("returns products in key order and reports a missing product", async () => {
    const product1 = product(1n);
    const product3 = product(3n);
    const findByIds = vi.fn().mockResolvedValue([product1, product3]);
    const loader = createProductByIdLoader({
      findByIds,
    } as unknown as ProductService);

    const result = await loader.loadMany([3n, 1n, 8n]);

    expect(findByIds).toHaveBeenCalledWith([3n, 1n, 8n]);
    expect(result[0]).toBe(product3);
    expect(result[1]).toBe(product1);
    expect(result[2]).toEqual(new Error("Product 8 not found"));
  });
});
