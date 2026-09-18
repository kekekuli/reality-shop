import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Address } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { OrderService, type OrderRequestItem } from "./order.service";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
    ORDER_PAYMENT_TTL: 30 * 60,
  },
}));

const userId = 1n;
const now = new Date("2026-09-18T08:00:00.000Z");

const address: Address = {
  id: 10n,
  userId,
  receiverName: "Alice",
  phone: "123456789",
  province: "Province",
  city: "City",
  district: "District",
  detail: "Street 1",
  isDefault: true,
  createdAt: now,
  updatedAt: now,
};

type TestSkuRecord = {
  id: bigint;
  skuCode: string;
  specValues: Record<string, string>;
  priceCents: bigint;
  status: string;
  product: {
    title: string;
    status: string;
  };
  inventory: {
    available: number;
  } | null;
};

function skuRecord(overrides: Partial<TestSkuRecord> = {}): TestSkuRecord {
  return {
    id: 2n,
    skuCode: "SKU-2",
    specValues: { color: "black" },
    priceCents: 1_200n,
    status: "on_sale",
    product: {
      title: "Product 2",
      status: "on_sale",
    },
    inventory: {
      available: 10,
    },
    ...overrides,
  };
}

function createService(
  options: {
    skuRecords?: TestSkuRecord[];
    reservationCounts?: number[];
    findManyError?: Error;
    createError?: Error;
  } = {},
) {
  const findMany = options.findManyError
    ? vi.fn().mockRejectedValue(options.findManyError)
    : vi.fn().mockResolvedValue(options.skuRecords ?? [skuRecord()]);

  const updateMany = vi.fn();
  for (const count of options.reservationCounts ?? []) {
    updateMany.mockResolvedValueOnce({ count });
  }
  updateMany.mockResolvedValue({ count: 1 });

  const createdOrder = { id: 100n, orderNo: "created-order" };
  const create = options.createError
    ? vi.fn().mockRejectedValue(options.createError)
    : vi.fn().mockResolvedValue(createdOrder);

  const transactionClient = {
    sku: { findMany },
    inventory: { updateMany },
    order: { create },
  };

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

  return {
    service: new OrderService({
      $transaction: transaction,
    } as unknown as PrismaService),
    findMany,
    updateMany,
    create,
    transaction,
    createdOrder,
    wasRolledBack: () => rolledBack,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OrderService.createOrder", () => {
  it("rejects an empty order before starting a transaction", async () => {
    const { service, transaction } = createService();

    await expect(service.createOrder(userId, address, [])).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.ORDER_ITEMS_EMPTY,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("identifies the duplicated SKU", async () => {
    const { service, transaction } = createService();
    const items: OrderRequestItem[] = [
      { skuId: 2n, quantity: 1 },
      { skuId: 2n, quantity: 2 },
    ];

    await expect(service.createOrder(userId, address, items)).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.DUPLICATE_ORDER_ITEM,
      skuId: 2n,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([0, -1, 100, 1.5, Number.NaN])(
    "identifies invalid quantity %s and its SKU",
    async (quantity) => {
      const { service, transaction } = createService();

      await expect(
        service.createOrder(userId, address, [{ skuId: 2n, quantity }]),
      ).resolves.toEqual({
        ok: false,
        errCode: ErrorCode.INVALID_QUANTITY,
        skuId: 2n,
        quantity,
      });
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it("identifies the requested SKU that was not found", async () => {
    const { service } = createService({ skuRecords: [skuRecord()] });

    await expect(
      service.createOrder(userId, address, [
        { skuId: 2n, quantity: 1 },
        { skuId: 3n, quantity: 1 },
      ]),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.SKU_NOT_FOUND,
      skuId: 3n,
    });
  });

  it.each([
    skuRecord({ status: "off_shelf" }),
    skuRecord({
      product: { title: "Product 2", status: "off_shelf" },
    }),
  ])("identifies an unavailable SKU or product", async (record) => {
    const { service } = createService({ skuRecords: [record] });

    await expect(
      service.createOrder(userId, address, [{ skuId: 2n, quantity: 1 }]),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.SKU_NOT_AVAILABLE,
      skuId: 2n,
    });
  });

  it.each([
    skuRecord({ inventory: null }),
    skuRecord({ inventory: { available: 1 } }),
  ])("identifies the SKU with insufficient inventory", async (record) => {
    const { service } = createService({ skuRecords: [record] });

    await expect(
      service.createOrder(userId, address, [{ skuId: 2n, quantity: 2 }]),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.INSUFFICIENT_STOCK,
      skuId: 2n,
      requestedQuantity: 2,
    });
  });

  it("reserves inventory and creates immutable item and address snapshots", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
    const secondSku = skuRecord({
      id: 3n,
      skuCode: "SKU-3",
      specValues: { size: "large" },
      priceCents: 500n,
      product: { title: "Product 3", status: "on_sale" },
    });
    const { service, updateMany, create, createdOrder } = createService({
      skuRecords: [skuRecord(), secondSku],
    });
    const items: OrderRequestItem[] = [
      { skuId: 3n, quantity: 3 },
      { skuId: 2n, quantity: 2 },
    ];

    await expect(service.createOrder(userId, address, items)).resolves.toEqual({
      ok: true,
      order: createdOrder,
    });

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { skuId: 2n, available: { gte: 2 } },
      data: {
        reserved: { increment: 2 },
        available: { decrement: 2 },
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { skuId: 3n, available: { gte: 3 } },
      data: {
        reserved: { increment: 3 },
        available: { decrement: 3 },
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        orderNo: expect.any(String),
        user: { connect: { id: userId } },
        subtotalCents: 3_900n,
        shippingCents: 0n,
        totalCents: 3_900n,
        shippingReceiverName: address.receiverName,
        shippingPhone: address.phone,
        shippingProvince: address.province,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingDetail: address.detail,
        paymentExpiresAt: new Date("2026-09-18T08:30:00.000Z"),
        orderItems: {
          create: [
            {
              sku: { connect: { id: 3n } },
              skuCode: "SKU-3",
              productTitle: "Product 3",
              specValues: { size: "large" },
              unitPriceCents: 500n,
              quantity: 3,
              lineTotalCents: 1_500n,
            },
            {
              sku: { connect: { id: 2n } },
              skuCode: "SKU-2",
              productTitle: "Product 2",
              specValues: { color: "black" },
              unitPriceCents: 1_200n,
              quantity: 2,
              lineTotalCents: 2_400n,
            },
          ],
        },
      },
      include: { orderItems: true },
    });
  });

  it("lets the transaction roll back when a later reservation loses the race", async () => {
    const secondSku = skuRecord({ id: 3n, skuCode: "SKU-3" });
    const { service, create, wasRolledBack } = createService({
      skuRecords: [skuRecord(), secondSku],
      reservationCounts: [1, 0],
    });

    await expect(
      service.createOrder(userId, address, [
        { skuId: 2n, quantity: 1 },
        { skuId: 3n, quantity: 4 },
      ]),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.INSUFFICIENT_STOCK,
      skuId: 3n,
      requestedQuantity: 4,
    });
    expect(wasRolledBack()).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not hide unexpected database errors", async () => {
    const databaseError = new Error("database unavailable");
    const { service } = createService({ findManyError: databaseError });

    await expect(
      service.createOrder(userId, address, [{ skuId: 2n, quantity: 1 }]),
    ).rejects.toBe(databaseError);
  });

  it("rolls back reserved inventory when creating the order fails", async () => {
    const databaseError = new Error("order insert failed");
    const { service, updateMany, wasRolledBack } = createService({
      createError: databaseError,
    });

    await expect(
      service.createOrder(userId, address, [{ skuId: 2n, quantity: 1 }]),
    ).rejects.toBe(databaseError);
    expect(updateMany).toHaveBeenCalledOnce();
    expect(wasRolledBack()).toBe(true);
  });
});
