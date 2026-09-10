import type DataLoader from "dataloader";
import { describe, expect, it, vi } from "vitest";
import type { Sku as PrismaSku } from "../../generated/prisma/client";
import { CartItemResolver } from "./cart-item.resolver";

describe("CartItemResolver.sku", () => {
  it("loads and maps the cart item's SKU", async () => {
    const row: PrismaSku = {
      id: 7n,
      productId: 10n,
      skuCode: "phone-128gb",
      specValues: {},
      priceCents: 1000n,
      status: "on_sale",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const load = vi.fn().mockResolvedValue(row);
    const loader = { load } as unknown as DataLoader<bigint, PrismaSku>;

    await expect(
      new CartItemResolver().sku({ skuId: "7", quantity: 2 }, loader),
    ).resolves.toEqual({
      skuId: "7",
      skuCode: "phone-128gb",
      price: 1000n,
      status: "on_sale",
      productId: "10",
    });
    expect(load).toHaveBeenCalledWith(7n);
  });
});
