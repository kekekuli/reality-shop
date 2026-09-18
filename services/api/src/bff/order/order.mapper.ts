import type { Prisma } from "../../generated/prisma/client";
import type { CreateOrderFailure } from "../../modules/order/order.service";
import { ErrorCode } from "../../common/errors/error-code";
import {
  CreateOrderErrorType,
  OrderItemSpecType,
  OrderItemType,
  OrderType,
} from "./order.type";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    orderItems: true;
  };
}>;

export function toOrder(row: OrderWithItems): OrderType {
  return {
    orderNo: row.orderNo,
    status: row.status,
    subtotal: row.subtotalCents,
    shipping: row.shippingCents,
    total: row.totalCents,
    currency: row.currency,
    shippingAddress: {
      receiverName: row.shippingReceiverName,
      phone: row.shippingPhone,
      province: row.shippingProvince,
      city: row.shippingCity,
      district: row.shippingDistrict,
      detail: row.shippingDetail,
    },
    items: row.orderItems.map(toOrderItem),
    paymentExpiresAt: row.paymentExpiresAt,
    paidAt: row.paidAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
  };
}

export function toCreateOrderError(
  failure: CreateOrderFailure,
): CreateOrderErrorType {
  switch (failure.errCode) {
    case ErrorCode.ORDER_ITEMS_EMPTY:
      return { code: failure.errCode };
    case ErrorCode.DUPLICATE_ORDER_ITEM:
    case ErrorCode.SKU_NOT_FOUND:
    case ErrorCode.SKU_NOT_AVAILABLE:
      return {
        code: failure.errCode,
        skuId: String(failure.skuId),
      };
    case ErrorCode.INVALID_QUANTITY:
      return {
        code: failure.errCode,
        skuId: String(failure.skuId),
        quantity: failure.quantity,
      };
    case ErrorCode.INSUFFICIENT_STOCK:
      return {
        code: failure.errCode,
        skuId: String(failure.skuId),
        requestedQuantity: failure.requestedQuantity,
      };
  }
}

function toOrderItem(row: OrderWithItems["orderItems"][number]): OrderItemType {
  return {
    skuId: String(row.skuId),
    skuCode: row.skuCode,
    productTitle: row.productTitle,
    specs: toOrderItemSpecs(row.specValues),
    unitPrice: row.unitPriceCents,
    quantity: row.quantity,
    lineTotal: row.lineTotalCents,
  };
}

function toOrderItemSpecs(value: Prisma.JsonValue): OrderItemSpecType[] {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Order item specValues must be a JSON object");
  }

  return Object.entries(value).map(([key, specValue]) => {
    if (typeof specValue !== "string") {
      throw new Error("Order item specValues must contain only strings");
    }

    return { key, value: specValue };
  });
}
