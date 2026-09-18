import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Address } from "../../generated/prisma/client";
import { AddressService } from "../../modules/address/address.service";
import { OrderService } from "../../modules/order/order.service";
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
}) {
  const findByIdForUser = vi.fn().mockResolvedValue(options.address);
  const createOrder = vi.fn().mockResolvedValue(options.orderResult);

  return {
    service: new CheckoutService(
      { findByIdForUser } as unknown as AddressService,
      { createOrder } as unknown as OrderService,
    ),
    findByIdForUser,
    createOrder,
  };
}

describe("CheckoutService.checkout", () => {
  it("returns the requested address ID without creating an order when the address is not owned", async () => {
    const { service, findByIdForUser, createOrder } = createCheckoutService({
      address: null,
    });

    await expect(service.checkout(userId, addressId, items)).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
      addressId,
    });
    expect(findByIdForUser).toHaveBeenCalledWith(userId, addressId);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("creates the order from the owned address", async () => {
    const orderResult = {
      ok: true,
      order: { id: 10n, orderNo: "order-10" },
    };
    const { service, createOrder } = createCheckoutService({
      address,
      orderResult,
    });

    await expect(service.checkout(userId, addressId, items)).resolves.toBe(
      orderResult,
    );
    expect(createOrder).toHaveBeenCalledWith(userId, address, items);
  });

  it("preserves an order creation business failure", async () => {
    const orderResult = {
      ok: false,
      errCode: ErrorCode.INSUFFICIENT_STOCK,
      skuId: 3n,
      requestedQuantity: 2,
    };
    const { service } = createCheckoutService({ address, orderResult });

    await expect(service.checkout(userId, addressId, items)).resolves.toBe(
      orderResult,
    );
  });
});
