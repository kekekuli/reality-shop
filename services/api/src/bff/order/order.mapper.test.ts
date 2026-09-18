import { describe, expect, it } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Order, OrderItem } from "../../generated/prisma/client";
import type { CreateOrderFailure } from "../../modules/order/order.service";
import { toCreateOrderError, toOrder } from "./order.mapper";

const timestamp = new Date("2026-09-18T08:00:00.000Z");

const order = {
  id: 1n,
  orderNo: "order-1",
  userId: 2n,
  status: "pending_payment",
  subtotalCents: 2_400n,
  shippingCents: 0n,
  totalCents: 2_400n,
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
      specValues: { color: "black", storage: "256gb" },
      unitPriceCents: 1_200n,
      quantity: 2,
      lineTotalCents: 2_400n,
      createdAt: timestamp,
    },
  ],
} satisfies Order & { orderItems: OrderItem[] };

describe("toOrder", () => {
  it("maps persistence fields into the public order shape", () => {
    expect(toOrder(order)).toEqual({
      orderNo: "order-1",
      status: "pending_payment",
      subtotal: 2_400n,
      shipping: 0n,
      total: 2_400n,
      currency: "cny",
      shippingAddress: {
        receiverName: "Alice",
        phone: "123456789",
        province: "Province",
        city: "City",
        district: "District",
        detail: "Street 1",
      },
      items: [
        {
          skuId: "3",
          skuCode: "SKU-3",
          productTitle: "Product 3",
          specs: [
            { key: "color", value: "black" },
            { key: "storage", value: "256gb" },
          ],
          unitPrice: 1_200n,
          quantity: 2,
          lineTotal: 2_400n,
        },
      ],
      paymentExpiresAt: new Date("2026-09-18T08:30:00.000Z"),
      paidAt: null,
      cancelledAt: null,
      createdAt: timestamp,
    });
  });

  it("does not silently accept an invalid spec snapshot", () => {
    const invalidOrder = {
      ...order,
      orderItems: [{ ...order.orderItems[0], specValues: { storage: 256 } }],
    };

    expect(() => toOrder(invalidOrder)).toThrow(
      "Order item specValues must contain only strings",
    );
  });
});

describe("toCreateOrderError", () => {
  const cases: Array<[CreateOrderFailure, object]> = [
    [
      { ok: false, errCode: ErrorCode.ORDER_ITEMS_EMPTY },
      { code: ErrorCode.ORDER_ITEMS_EMPTY },
    ],
    [
      {
        ok: false,
        errCode: ErrorCode.DUPLICATE_ORDER_ITEM,
        skuId: 3n,
      },
      { code: ErrorCode.DUPLICATE_ORDER_ITEM, skuId: "3" },
    ],
    [
      {
        ok: false,
        errCode: ErrorCode.INVALID_QUANTITY,
        skuId: 3n,
        quantity: 0,
      },
      { code: ErrorCode.INVALID_QUANTITY, skuId: "3", quantity: 0 },
    ],
    [
      {
        ok: false,
        errCode: ErrorCode.INSUFFICIENT_STOCK,
        skuId: 3n,
        requestedQuantity: 2,
      },
      {
        code: ErrorCode.INSUFFICIENT_STOCK,
        skuId: "3",
        requestedQuantity: 2,
      },
    ],
  ];

  it.each(cases)(
    "maps %# into its GraphQL error shape",
    (failure, expected) => {
      expect(toCreateOrderError(failure)).toEqual(expected);
    },
  );
});
