import type DataLoader from "dataloader";
import { describe, expect, it, vi } from "vitest";
import type { Product as PrismaProduct } from "../../generated/prisma/client";
import type { Sku } from "./sku.type";
import { SkuResolver } from "./sku.resolver";

describe("SkuResolver.product", () => {
  it("loads and maps the SKU's product", async () => {
    const row: PrismaProduct = {
      id: 10n,
      categoryId: 1n,
      slug: "phone",
      title: "Phone",
      brand: "Reality",
      attrs: {},
      status: "on_sale",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const load = vi.fn().mockResolvedValue(row);
    const loader = { load } as unknown as DataLoader<bigint, PrismaProduct>;
    const sku = {
      skuId: "7",
      skuCode: "phone-128gb",
      price: 1000n,
      status: "on_sale",
      productId: "10",
    } satisfies Sku;

    await expect(new SkuResolver().product(sku, loader)).resolves.toEqual({
      id: "10",
      slug: "phone",
      title: "Phone",
      brand: "Reality",
      status: "on_sale",
    });
    expect(load).toHaveBeenCalledWith(10n);
  });
});
