import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Order, OrderItem } from "../../generated/prisma/client";
import type { OrderService } from "../../modules/order/order.service";
import { encodeCursor } from "../../common/graphql/cursor";
import type { AuthenticatedRequest } from "../auth/gql-auth.guard";
import type { CheckoutService } from "./checkout.service";
import { OrderResolver } from "./order.resolver";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
    ORDER_PAYMENT_TTL: 30 * 60,
  },
}));

const userId = 2n;
const timestamp = new Date("2026-09-18T08:00:00.000Z");
const order = {
  id: 1n,
  orderNo: "order-1",
  userId,
  status: "pending_payment",
  subtotalCents: 1_200n,
  shippingCents: 0n,
  totalCents: 1_200n,
  currency: "cny",
  shippingReceiverName: "Alice",
  shippingPhone: "123456789",
  shippingProvince: "Province",
  shippingCity: "City",
  shippingDistrict: "District",
  shippingDetail: "Street 1",
  paymentExpiresAt: new Date("2026-09-18T08:30:00.000Z"),
  paidAt: null,
  cancelledAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  orderItems: [
    {
      orderId: 1n,
      skuId: 3n,
      skuCode: "SKU-3",
      productTitle: "Product 3",
      specValues: { color: "black" },
      unitPriceCents: 1_200n,
      quantity: 1,
      lineTotalCents: 1_200n,
      createdAt: timestamp,
    },
  ],
} satisfies Order & { orderItems: OrderItem[] };

function authenticatedRequest(): AuthenticatedRequest {
  return { auth: { userId } } as AuthenticatedRequest;
}

function createResolver(options: {
  findPage?: ReturnType<typeof vi.fn>;
  findByOrderNo?: ReturnType<typeof vi.fn>;
  checkout?: ReturnType<typeof vi.fn>;
}) {
  const findPageByUserId = options.findPage ?? vi.fn();
  const findByOrderNo = options.findByOrderNo ?? vi.fn();
  const checkout = options.checkout ?? vi.fn();

  return {
    resolver: new OrderResolver(
      { findPageByUserId, findByOrderNo } as unknown as OrderService,
      { checkout } as unknown as CheckoutService,
    ),
    findPageByUserId,
    findByOrderNo,
    checkout,
  };
}

describe("OrderResolver.queries", () => {
  it("maps a page and keeps the database ID only inside the cursor", async () => {
    const findPage = vi.fn().mockResolvedValue([order]);
    const { resolver, findPageByUserId } = createResolver({ findPage });

    const result = await resolver.orders(authenticatedRequest(), 1);

    expect(result.edges).toEqual([
      {
        node: expect.objectContaining({ orderNo: "order-1" }),
        cursor: encodeCursor(order.createdAt, order.id),
      },
    ]);
    expect(result.pageInfo).toEqual({
      hasNextPage: false,
      endCursor: encodeCursor(order.createdAt, order.id),
    });
    expect(findPageByUserId).toHaveBeenCalledWith({
      userId,
      first: 1,
      cursor: undefined,
    });
    expect(result.edges[0].node).not.toHaveProperty("id");
  });

  it("maps an owned order and returns null when it is absent", async () => {
    const findByOrderNo = vi
      .fn()
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(null);
    const { resolver } = createResolver({ findByOrderNo });

    await expect(
      resolver.order(authenticatedRequest(), "order-1"),
    ).resolves.toEqual(expect.objectContaining({ orderNo: "order-1" }));
    await expect(
      resolver.order(authenticatedRequest(), "missing"),
    ).resolves.toBeNull();
    expect(findByOrderNo).toHaveBeenNthCalledWith(1, userId, "order-1");
  });
});

describe("OrderResolver.createOrder", () => {
  const input = {
    addressId: "5",
    items: [{ skuId: "3", quantity: 1 }],
  };

  it.each([
    { ...input, addressId: "invalid" },
    { ...input, items: [{ skuId: "invalid", quantity: 1 }] },
  ])("rejects invalid public IDs before checkout", async (invalidInput) => {
    const { resolver, checkout } = createResolver({});

    const result = await resolver.createOrder(
      invalidInput,
      authenticatedRequest(),
    );

    expect(result.errors).toHaveLength(1);
    expect(checkout).not.toHaveBeenCalled();
  });

  it("returns the mapped pending order", async () => {
    const checkout = vi.fn().mockResolvedValue({ ok: true, order });
    const { resolver } = createResolver({ checkout });

    await expect(
      resolver.createOrder(input, authenticatedRequest()),
    ).resolves.toEqual({
      data: expect.objectContaining({
        orderNo: "order-1",
        status: "pending_payment",
      }),
      errors: [],
    });
    expect(checkout).toHaveBeenCalledWith(userId, 5n, [
      { skuId: 3n, quantity: 1 },
    ]);
  });

  it("preserves address and order failure details", async () => {
    const checkout = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        errCode: ErrorCode.ADDRESS_NOT_FOUND,
        addressId: 5n,
      })
      .mockResolvedValueOnce({
        ok: false,
        errCode: ErrorCode.INSUFFICIENT_STOCK,
        skuId: 3n,
        requestedQuantity: 2,
      });
    const { resolver } = createResolver({ checkout });

    await expect(
      resolver.createOrder(input, authenticatedRequest()),
    ).resolves.toEqual({
      errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND, addressId: "5" }],
    });
    await expect(
      resolver.createOrder(
        { ...input, items: [{ skuId: "3", quantity: 2 }] },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      errors: [
        {
          code: ErrorCode.INSUFFICIENT_STOCK,
          skuId: "3",
          requestedQuantity: 2,
        },
      ],
    });
  });
});
