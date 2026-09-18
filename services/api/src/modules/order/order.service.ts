import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Prisma,
  type Address,
  type OrderItem,
} from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PURCHASE_QUANTITY,
  type ProductStatus,
  type SkuStatus,
} from "@reality-shop/shared-types";
import { ErrorCode } from "../../common/errors/error-code";
import { env } from "../../env";

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findPageByUserId({
    userId,
    first,
    cursor,
  }: {
    userId: bigint;
    first: number;
    cursor?: {
      sortKey: Date;
      id: bigint;
    };
  }) {
    const where: Prisma.OrderWhereInput = { userId };

    if (cursor) {
      where.OR = [
        {
          createdAt: {
            lt: cursor.sortKey,
          },
        },
        {
          createdAt: cursor.sortKey,
          id: {
            lt: cursor.id,
          },
        },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: orderWithItems,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: first + 1,
    });
  }

  async findByOrderNo(userId: bigint, orderNo: string) {
    return this.prisma.order.findUnique({
      where: {
        orderNo,
        userId,
      },
      include: orderWithItems,
    });
  }

  async createOrder(
    userId: bigint,
    address: Address,
    items: readonly OrderRequestItem[],
  ): Promise<CreateOrderResult> {
    const requestedItems = validateRequestedItems(items);
    if (!requestedItems.ok) {
      return requestedItems;
    }

    const skuIds = Array.from(requestedItems.requestedItemsBySkuId.keys());

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const skuRecords = await transaction.sku.findMany({
          where: {
            id: {
              in: skuIds,
            },
          },
          select: orderSkuSelect,
          orderBy: {
            id: "asc",
          },
        });

        const snapshot = buildOrderSnapshot(
          skuRecords,
          requestedItems.requestedItemsBySkuId,
        );
        if (!snapshot.ok) {
          return snapshot;
        }

        await reserveInventory(transaction, items);

        const order = await transaction.order.create({
          data: buildOrderCreateData(userId, address, snapshot),
          include: {
            orderItems: true,
          },
        });

        return { ok: true as const, order };
      });
    } catch (error) {
      if (error instanceof InventoryReservationError) {
        return {
          ok: false,
          errCode: ErrorCode.INSUFFICIENT_STOCK,
          skuId: error.skuId,
          requestedQuantity: error.requestedQuantity,
        };
      }

      throw error;
    }
  }
}

export type OrderRequestItem = Pick<OrderItem, "skuId" | "quantity">;

export type CreateOrderFailure =
  | {
      ok: false;
      errCode: ErrorCode.ORDER_ITEMS_EMPTY;
    }
  | {
      ok: false;
      errCode: ErrorCode.DUPLICATE_ORDER_ITEM;
      skuId: bigint;
    }
  | {
      ok: false;
      errCode: ErrorCode.INVALID_QUANTITY;
      skuId: bigint;
      quantity: number;
    }
  | {
      ok: false;
      errCode: ErrorCode.SKU_NOT_FOUND;
      skuId: bigint;
    }
  | {
      ok: false;
      errCode: ErrorCode.SKU_NOT_AVAILABLE;
      skuId: bigint;
    }
  | {
      ok: false;
      errCode: ErrorCode.INSUFFICIENT_STOCK;
      skuId: bigint;
      requestedQuantity: number;
    };

type CreatedOrder = Prisma.OrderGetPayload<{
  include: {
    orderItems: true;
  };
}>;

export type CreateOrderResult =
  | {
      ok: true;
      order: CreatedOrder;
    }
  | CreateOrderFailure;

const orderSkuSelect = {
  id: true,
  skuCode: true,
  specValues: true,
  priceCents: true,
  status: true,
  product: {
    select: {
      title: true,
      status: true,
    },
  },
  inventory: {
    select: {
      available: true,
    },
  },
} satisfies Prisma.SkuSelect;

type OrderSkuRecord = Prisma.SkuGetPayload<{
  select: typeof orderSkuSelect;
}>;

const orderWithItems = {
  orderItems: {
    orderBy: {
      skuId: "asc",
    },
  },
} satisfies Prisma.OrderInclude;

function validateRequestedItems(items: readonly OrderRequestItem[]):
  | CreateOrderFailure
  | {
      ok: true;
      requestedItemsBySkuId: Map<bigint, OrderRequestItem>;
    } {
  if (items.length === 0) {
    return { ok: false, errCode: ErrorCode.ORDER_ITEMS_EMPTY };
  }

  const requestedItemsBySkuId = new Map<bigint, OrderRequestItem>();

  for (const item of items) {
    if (requestedItemsBySkuId.has(item.skuId)) {
      return {
        ok: false,
        errCode: ErrorCode.DUPLICATE_ORDER_ITEM,
        skuId: item.skuId,
      };
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < PURCHASE_QUANTITY.min ||
      item.quantity > PURCHASE_QUANTITY.max
    ) {
      return {
        ok: false,
        errCode: ErrorCode.INVALID_QUANTITY,
        skuId: item.skuId,
        quantity: item.quantity,
      };
    }

    requestedItemsBySkuId.set(item.skuId, item);
  }

  return { ok: true, requestedItemsBySkuId };
}

function getSkuPurchaseFailure(
  record: OrderSkuRecord,
  quantity: number,
): CreateOrderFailure | null {
  if (
    record.status !== ("on_sale" satisfies SkuStatus) ||
    record.product.status !== ("on_sale" satisfies ProductStatus)
  ) {
    return {
      ok: false,
      errCode: ErrorCode.SKU_NOT_AVAILABLE,
      skuId: record.id,
    };
  }

  if (!record.inventory || record.inventory.available < quantity) {
    return {
      ok: false,
      errCode: ErrorCode.INSUFFICIENT_STOCK,
      skuId: record.id,
      requestedQuantity: quantity,
    };
  }

  return null;
}

function buildOrderSnapshot(
  skuRecords: readonly OrderSkuRecord[],
  requestedItemsBySkuId: ReadonlyMap<bigint, OrderRequestItem>,
):
  | CreateOrderFailure
  | {
      ok: true;
      orderItems: Prisma.OrderItemCreateWithoutOrderInput[];
      subtotalCents: bigint;
    } {
  const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];
  let subtotalCents = 0n;
  const skuRecordsById = new Map(
    skuRecords.map((record) => [record.id, record] as const),
  );

  for (const requestedItem of requestedItemsBySkuId.values()) {
    const record = skuRecordsById.get(requestedItem.skuId);
    if (!record) {
      return {
        ok: false,
        errCode: ErrorCode.SKU_NOT_FOUND,
        skuId: requestedItem.skuId,
      };
    }

    const failure = getSkuPurchaseFailure(record, requestedItem.quantity);
    if (failure) {
      return failure;
    }

    const lineTotalCents = record.priceCents * BigInt(requestedItem.quantity);
    subtotalCents += lineTotalCents;

    orderItems.push({
      sku: {
        connect: { id: record.id },
      },
      skuCode: record.skuCode,
      productTitle: record.product.title,
      specValues:
        record.specValues === null ? Prisma.JsonNull : record.specValues,
      unitPriceCents: record.priceCents,
      quantity: requestedItem.quantity,
      lineTotalCents,
    });
  }

  return { ok: true, orderItems, subtotalCents };
}

function buildOrderCreateData(
  userId: bigint,
  address: Address,
  snapshot: {
    orderItems: Prisma.OrderItemCreateWithoutOrderInput[];
    subtotalCents: bigint;
  },
): Prisma.OrderCreateInput {
  const shippingCents = 0n;

  return {
    orderNo: randomUUID(),
    user: {
      connect: { id: userId },
    },
    subtotalCents: snapshot.subtotalCents,
    shippingCents,
    totalCents: snapshot.subtotalCents + shippingCents,
    shippingReceiverName: address.receiverName,
    shippingPhone: address.phone,
    shippingProvince: address.province,
    shippingCity: address.city,
    shippingDistrict: address.district,
    shippingDetail: address.detail,
    paymentExpiresAt: new Date(Date.now() + env.ORDER_PAYMENT_TTL * 1_000),
    orderItems: {
      create: snapshot.orderItems,
    },
  };
}

class InventoryReservationError extends Error {
  constructor(
    readonly skuId: bigint,
    readonly requestedQuantity: number,
  ) {
    super("Inventory reservation failed");
  }
}

async function reserveInventory(
  transaction: Prisma.TransactionClient,
  items: readonly OrderRequestItem[],
): Promise<void> {
  const sortedItems = [...items].sort((a, b) =>
    a.skuId < b.skuId ? -1 : a.skuId > b.skuId ? 1 : 0,
  );

  for (const item of sortedItems) {
    const result = await transaction.inventory.updateMany({
      where: {
        skuId: item.skuId,
        available: {
          gte: item.quantity,
        },
      },
      data: {
        reserved: {
          increment: item.quantity,
        },
        available: {
          decrement: item.quantity,
        },
      },
    });

    if (result.count !== 1) {
      throw new InventoryReservationError(item.skuId, item.quantity);
    }
  }
}
