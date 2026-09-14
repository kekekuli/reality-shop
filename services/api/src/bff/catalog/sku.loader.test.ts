import { describe, expect, it, vi } from "vitest";
import type { Sku as PrismaSku } from "../../generated/prisma/client";
import type { SkuService } from "../../modules/catalog/sku.service";
import { createSkuByIdLoader, createSkusByProductIdLoader } from "./sku.loader";

function sku(id: bigint, productId: bigint): PrismaSku {
  return {
    id,
    productId,
    skuCode: `sku-${id.toString()}`,
    specValues: {},
    priceCents: 1000n,
    status: "on_sale",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("createSkuByIdLoader", () => {
  it("returns SKUs in key order and reports a missing SKU at its position", async () => {
    const sku1 = sku(1n, 10n);
    const sku3 = sku(3n, 20n);
    const findByIds = vi.fn().mockResolvedValue([sku1, sku3]);
    const loader = createSkuByIdLoader({
      findByIds,
    } as unknown as SkuService);

    const result = await loader.loadMany([3n, 1n, 8n]);

    expect(findByIds).toHaveBeenCalledWith([3n, 1n, 8n]);
    expect(result[0]).toBe(sku3);
    expect(result[1]).toBe(sku1);
    expect(result[2]).toEqual(new Error("SKU 8 not found"));
  });
});

describe("createSkusByProductIdLoader", () => {
  it("groups SKUs by product while preserving product key order", async () => {
    const product10Sku1 = sku(1n, 10n);
    const product10Sku2 = sku(2n, 10n);
    const product20Sku = sku(3n, 20n);
    const findByProductIDs = vi
      .fn()
      .mockResolvedValue([product20Sku, product10Sku1, product10Sku2]);
    const loader = createSkusByProductIdLoader({
      findByProductIDs,
    } as unknown as SkuService);

    await expect(loader.loadMany([20n, 10n, 30n])).resolves.toEqual([
      [product20Sku],
      [product10Sku1, product10Sku2],
      [],
    ]);
    expect(findByProductIDs).toHaveBeenCalledWith([20n, 10n, 30n]);
  });
});
