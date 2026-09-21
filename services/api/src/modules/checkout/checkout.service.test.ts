import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Address } from "../../generated/prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";
import type { AddressService } from "../address/address.service";
import type { CartService } from "../cart/cart.service";
import type { OrderService } from "../order/order.service";
import { CheckoutService } from "./checkout.service";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
    ORDER_PAYMENT_TTL: 30 * 60,
  },
}));

const userId = 1n;
const addressId = 2n;
const items = [{ skuId: 3n, quantity: 2 }];
const timestamp = new Date("2026-09-18T08:00:00.000Z");

const address: Address = {
  id: addressId,
  userId,
  receiverName: "Alice",
  phone: "123456789",
  province: "Province",
  city: "City",
  district: "District",
  detail: "Street 1",
  isDefault: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function createCheckoutService(options: {
  address: Address | null;
  orderResult?: object;
  removeError?: Error;
}) {
  const transactionClient = { transaction: true };
  let rolledBack = false;
  const transaction = vi.fn(
    async (
      callback: (client: typeof transactionClient) => Promise<unknown>,
    ) => {
      try {
        return await callback(transactionClient);
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  );
  const findByIdForUser = vi.fn().mockResolvedValue(options.address);
  const createOrder = vi.fn().mockResolvedValue(options.orderResult);
  const removeItems = options.removeError
    ? vi.fn().mockRejectedValue(options.removeError)
    : vi.fn().mockResolvedValue(undefined);

  return {
    service: new CheckoutService(
      { $transaction: transaction } as unknown as PrismaService,
      { findByIdForUser } as unknown as AddressService,
      { createOrder } as unknown as OrderService,
      { removeItems } as unknown as CartService,
    ),
    transactionClient,
    transaction,
    findByIdForUser,
    createOrder,
    removeItems,
    wasRolledBack: () => rolledBack,
  };
}

describe("CheckoutService.checkout", () => {
  it("stops before order creation when the address is not owned", async () => {
    const context = createCheckoutService({ address: null });

    await expect(
      context.service.checkout(userId, addressId, items),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
      addressId,
    });
    expect(context.findByIdForUser).toHaveBeenCalledWith(
      userId,
      addressId,
      context.transactionClient,
    );
    expect(context.createOrder).not.toHaveBeenCalled();
    expect(context.removeItems).not.toHaveBeenCalled();
  });

  it("creates the order and clears its cart items in one transaction", async () => {
    const orderResult = {
      ok: true,
      order: { id: 10n, orderNo: "order-10" },
    };
    const context = createCheckoutService({ address, orderResult });

    await expect(
      context.service.checkout(userId, addressId, items),
    ).resolves.toBe(orderResult);
    expect(context.createOrder).toHaveBeenCalledWith(
      context.transactionClient,
      userId,
      address,
      items,
    );
    expect(context.removeItems).toHaveBeenCalledWith(
      userId,
      [3n],
      context.transactionClient,
    );
  });

  it("keeps the cart when order creation returns a business failure", async () => {
    const orderResult = {
      ok: false,
      errCode: ErrorCode.INSUFFICIENT_STOCK,
      skuId: 3n,
      requestedQuantity: 2,
    };
    const context = createCheckoutService({ address, orderResult });

    await expect(
      context.service.checkout(userId, addressId, items),
    ).resolves.toBe(orderResult);
    expect(context.removeItems).not.toHaveBeenCalled();
  });

  it("rejects the transaction when clearing the cart fails", async () => {
    const databaseError = new Error("cart delete failed");
    const context = createCheckoutService({
      address,
      orderResult: {
        ok: true,
        order: { id: 10n, orderNo: "order-10" },
      },
      removeError: databaseError,
    });

    await expect(
      context.service.checkout(userId, addressId, items),
    ).rejects.toBe(databaseError);
    expect(context.wasRolledBack()).toBe(true);
  });
});
