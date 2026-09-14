import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { CartItem } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CartService } from "./cart.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
  },
}));

const userId = 1n;
const skuId = 2n;

function cartItem(quantity: number): CartItem {
  return {
    userId,
    skuId,
    quantity,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function createService(options?: {
  sku?: object | null;
  upsertResult?: CartItem;
  upsertError?: Error;
}) {
  const upsert = options?.upsertError
    ? vi.fn().mockRejectedValue(options.upsertError)
    : vi.fn().mockResolvedValue(options?.upsertResult ?? cartItem(1));
  const transactionClient = { cartItem: { upsert } };
  const transaction = vi
    .fn()
    .mockImplementation(
      (callback: (client: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
  const sku = options && "sku" in options ? options.sku : { id: skuId };
  const findUnique = vi.fn().mockResolvedValue(sku);
  const prisma = {
    sku: { findUnique },
    $transaction: transaction,
  };

  return {
    service: new CartService(prisma as unknown as PrismaService),
    findUnique,
    transaction,
    upsert,
  };
}

describe("CartService.addItem", () => {
  it.each([0, -1, 100, 1.5, Number.NaN])(
    "rejects invalid quantity %s before accessing the database",
    async (quantity) => {
      const { service, findUnique, transaction } = createService();

      await expect(service.addItem(userId, skuId, quantity)).resolves.toEqual({
        ok: false,
        errCode: ErrorCode.INVALID_QUANTITY,
      });
      expect(findUnique).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it("returns SKU_NOT_FOUND when the SKU does not exist", async () => {
    const { service, transaction } = createService({ sku: null });

    await expect(service.addItem(userId, skuId, 1)).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.SKU_NOT_FOUND,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("upserts the item and returns the resulting quantity", async () => {
    const item = cartItem(3);
    const { service, upsert } = createService({ upsertResult: item });

    await expect(service.addItem(userId, skuId, 2)).resolves.toEqual({
      ok: true,
      cartItem: item,
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_skuId: { userId, skuId } },
      create: { userId, skuId, quantity: 2 },
      update: { quantity: { increment: 2 } },
    });
  });

  it("rolls back and returns a business error when the total exceeds 99", async () => {
    const { service } = createService({ upsertResult: cartItem(100) });

    await expect(service.addItem(userId, skuId, 2)).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.CART_QUANTITY_LIMIT_EXCEED,
    });
  });

  it("does not hide unexpected database errors", async () => {
    const databaseError = new Error("database unavailable");
    const { service } = createService({ upsertError: databaseError });

    await expect(service.addItem(userId, skuId, 1)).rejects.toBe(databaseError);
  });
});

describe("CartService.removeItem", () => {
  it("is successful even when no matching cart item exists", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const service = new CartService({
      cartItem: { deleteMany },
    } as unknown as PrismaService);

    await expect(service.removeItem(userId, skuId)).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId, skuId },
    });
  });
});

describe("CartService.updateItemQuantity", () => {
  it.each([0, -1, 100, 1.5, Number.NaN])(
    "rejects invalid quantity %s before accessing the database",
    async (quantity) => {
      const update = vi.fn();
      const service = new CartService({
        cartItem: { update },
      } as unknown as PrismaService);

      await expect(
        service.updateItemQuantity(userId, skuId, quantity),
      ).resolves.toEqual({
        ok: false,
        errCode: ErrorCode.INVALID_QUANTITY,
      });
      expect(update).not.toHaveBeenCalled();
    },
  );

  it("sets the final quantity instead of applying a delta", async () => {
    const item = cartItem(4);
    const update = vi.fn().mockResolvedValue(item);
    const service = new CartService({
      cartItem: { update },
    } as unknown as PrismaService);

    await expect(
      service.updateItemQuantity(userId, skuId, 4),
    ).resolves.toEqual({ ok: true, cartItem: item });
    expect(update).toHaveBeenCalledWith({
      where: { userId_skuId: { userId, skuId } },
      data: { quantity: 4 },
    });
  });

  it("returns CART_ITEM_NOT_FOUND when the item no longer exists", async () => {
    const update = vi.fn().mockRejectedValue(
      new PrismaClientKnownRequestError("record not found", {
        code: "P2025",
        clientVersion: "7.8.0",
      }),
    );
    const service = new CartService({
      cartItem: { update },
    } as unknown as PrismaService);

    await expect(
      service.updateItemQuantity(userId, skuId, 2),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.CART_ITEM_NOT_FOUND,
    });
  });
});
