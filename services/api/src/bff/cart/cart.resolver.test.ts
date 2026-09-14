import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { CartItem } from "../../generated/prisma/client";
import type { CartService } from "../../modules/cart/cart.service";
import type { AuthenticatedRequest } from "../user/gql-auth.guard";
import { CartResolver } from "./cart.resolver";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
  },
}));

const userId = 42n;
const skuId = 7n;

function authenticatedRequest(): AuthenticatedRequest {
  return {
    auth: { userId },
  } as AuthenticatedRequest;
}

function createResolver(result: Awaited<ReturnType<CartService["addItem"]>>) {
  const addItem = vi.fn().mockResolvedValue(result);
  const service = { addItem } as unknown as CartService;

  return {
    resolver: new CartResolver(service),
    addItem,
  };
}

describe("CartResolver.addCartItem", () => {
  it("uses the authenticated user id and maps a successful item", async () => {
    const item: CartItem = {
      userId,
      skuId,
      quantity: 3,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const { resolver, addItem } = createResolver({
      ok: true,
      cartItem: item,
    });

    await expect(
      resolver.addCartItem(
        { skuId: skuId.toString(), quantity: 2 },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      data: { skuId: "7", quantity: 3 },
      errors: [],
    });
    expect(addItem).toHaveBeenCalledWith(userId, skuId, 2);
  });

  it("maps a service business error to a code-only payload", async () => {
    const { resolver } = createResolver({
      ok: false,
      errCode: ErrorCode.CART_QUANTITY_LIMIT_EXCEED,
    });

    await expect(
      resolver.addCartItem(
        { skuId: skuId.toString(), quantity: 2 },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      errors: [{ code: ErrorCode.CART_QUANTITY_LIMIT_EXCEED }],
    });
  });

  it.each(["not-an-id", "", "0", "-1"])(
    "rejects invalid SKU id %j before calling the service",
    async (invalidSkuId) => {
      const { resolver, addItem } = createResolver({
        ok: false,
        errCode: ErrorCode.SKU_NOT_FOUND,
      });

      await expect(
        resolver.addCartItem(
          { skuId: invalidSkuId, quantity: 1 },
          authenticatedRequest(),
        ),
      ).resolves.toEqual({
        errors: [{ code: ErrorCode.SKU_NOT_FOUND }],
      });
      expect(addItem).not.toHaveBeenCalled();
    },
  );
});

describe("CartResolver.cart", () => {
  it("returns the authenticated user's mapped cart items", async () => {
    const items = [
      {
        userId,
        skuId,
        quantity: 2,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] satisfies CartItem[];
    const listItems = vi.fn().mockResolvedValue(items);
    const resolver = new CartResolver({ listItems } as unknown as CartService);

    await expect(resolver.cart(authenticatedRequest())).resolves.toEqual({
      items: [{ skuId: "7", quantity: 2 }],
    });
    expect(listItems).toHaveBeenCalledWith(userId);
  });

  it("does not disguise an unexpected failure as an empty cart", async () => {
    const databaseError = new Error("database unavailable");
    const listItems = vi.fn().mockRejectedValue(databaseError);
    const resolver = new CartResolver({ listItems } as unknown as CartService);

    await expect(resolver.cart(authenticatedRequest())).rejects.toBe(
      databaseError,
    );
  });
});

describe("CartResolver.removeCartItem", () => {
  it("removes the authenticated user's item and returns its SKU id", async () => {
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const resolver = new CartResolver({ removeItem } as unknown as CartService);

    await expect(
      resolver.removeCartItem({ skuId: "7" }, authenticatedRequest()),
    ).resolves.toEqual({
      data: { skuId: "7" },
      errors: [],
    });
    expect(removeItem).toHaveBeenCalledWith(userId, skuId);
  });

  it.each(["not-an-id", "", "0", "-1"])(
    "rejects invalid SKU id %j before calling the service",
    async (invalidSkuId) => {
      const removeItem = vi.fn();
      const resolver = new CartResolver({
        removeItem,
      } as unknown as CartService);

      await expect(
        resolver.removeCartItem(
          { skuId: invalidSkuId },
          authenticatedRequest(),
        ),
      ).resolves.toEqual({
        errors: [{ code: ErrorCode.SKU_NOT_FOUND }],
      });
      expect(removeItem).not.toHaveBeenCalled();
    },
  );
});

describe("CartResolver.updateCartItemQuantity", () => {
  it("sets the authenticated user's final item quantity", async () => {
    const item: CartItem = {
      userId,
      skuId,
      quantity: 4,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const updateItemQuantity = vi.fn().mockResolvedValue({
      ok: true,
      cartItem: item,
    });
    const resolver = new CartResolver({
      updateItemQuantity,
    } as unknown as CartService);

    await expect(
      resolver.updateCartItemQuantity(
        { skuId: "7", quantity: 4 },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      data: { skuId: "7", quantity: 4 },
      errors: [],
    });
    expect(updateItemQuantity).toHaveBeenCalledWith(userId, skuId, 4);
  });

  it("maps a quantity update business error", async () => {
    const updateItemQuantity = vi.fn().mockResolvedValue({
      ok: false,
      errCode: ErrorCode.INVALID_QUANTITY,
    });
    const resolver = new CartResolver({
      updateItemQuantity,
    } as unknown as CartService);

    await expect(
      resolver.updateCartItemQuantity(
        { skuId: "7", quantity: 0 },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      errors: [{ code: ErrorCode.INVALID_QUANTITY }],
    });
  });
});
