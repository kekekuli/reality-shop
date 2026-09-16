import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Address } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AddressService } from "./address.service";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
  },
}));

const userId = 1n;
const addressId = 2n;
const timestamp = new Date("2026-01-01T00:00:00.000Z");
const input = {
  receiverName: "Alice",
  phone: "123456789",
  province: "Province",
  city: "City",
  district: "District",
  detail: "Street 1",
};

function address(overrides: Partial<Address> = {}): Address {
  return {
    id: addressId,
    userId,
    ...input,
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function notFoundError() {
  return new PrismaClientKnownRequestError("record not found", {
    code: "P2025",
    clientVersion: "7.8.0",
  });
}

function serviceWithTransaction(transactionAddress: object) {
  const transactionClient = { address: transactionAddress };
  const transaction = vi
    .fn()
    .mockImplementation(
      (callback: (client: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );

  return {
    service: new AddressService({
      $transaction: transaction,
    } as unknown as PrismaService),
    transaction,
  };
}

describe("AddressService.findByUserId", () => {
  it("lists only the user's addresses with the default first", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new AddressService({
      address: { findMany },
    } as unknown as PrismaService);

    await expect(service.findByUserId(userId)).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });
  });
});

describe("AddressService.create", () => {
  it("does not infer a default when one was not requested", async () => {
    const createdAddress = address();
    const create = vi.fn().mockResolvedValue(createdAddress);
    const service = new AddressService({
      address: { create },
    } as unknown as PrismaService);

    await expect(service.create(userId, input)).resolves.toBe(createdAddress);
    expect(create).toHaveBeenCalledWith({
      data: { ...input, userId, isDefault: false },
    });
  });

  it("unsets the previous default when the new address is default", async () => {
    const createdAddress = address({ isDefault: true });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue(createdAddress);
    const { service } = serviceWithTransaction({
      updateMany,
      create,
    });

    await service.create(userId, { ...input, isDefault: true });

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    expect(create).toHaveBeenCalledWith({
      data: { ...input, isDefault: true, userId },
    });
  });
});

describe("AddressService.update", () => {
  it("scopes an update by both user and address", async () => {
    const updatedAddress = address({ receiverName: "Bob" });
    const update = vi.fn().mockResolvedValue(updatedAddress);
    const service = new AddressService({
      address: { update },
    } as unknown as PrismaService);

    await expect(
      service.update(userId, addressId, { receiverName: "Bob" }),
    ).resolves.toEqual({ ok: true, address: updatedAddress });
    expect(update).toHaveBeenCalledWith({
      where: { id: addressId, userId },
      data: { receiverName: "Bob" },
    });
  });

  it("returns ADDRESS_NOT_FOUND without exposing ownership", async () => {
    const update = vi.fn().mockRejectedValue(notFoundError());
    const service = new AddressService({
      address: { update },
    } as unknown as PrismaService);

    await expect(
      service.update(userId, addressId, { receiverName: "Bob" }),
    ).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
    });
  });

  it("updates the address and switches the default in one transaction", async () => {
    const updatedAddress = address({ receiverName: "Bob", isDefault: true });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue(updatedAddress);
    const { service } = serviceWithTransaction({ updateMany, update });

    await expect(
      service.update(userId, addressId, {
        receiverName: "Bob",
        isDefault: true,
      }),
    ).resolves.toEqual({ ok: true, address: updatedAddress });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: addressId, userId },
      data: { receiverName: "Bob", isDefault: true },
    });
  });

  it("allows the current default to be unset", async () => {
    const updatedAddress = address({ isDefault: false });
    const update = vi.fn().mockResolvedValue(updatedAddress);
    const service = new AddressService({
      address: { update },
    } as unknown as PrismaService);

    await expect(
      service.update(userId, addressId, { isDefault: false }),
    ).resolves.toEqual({ ok: true, address: updatedAddress });
    expect(update).toHaveBeenCalledWith({
      where: { id: addressId, userId },
      data: { isDefault: false },
    });
  });

  it("does not hide unexpected database errors", async () => {
    const databaseError = new Error("database unavailable");
    const update = vi.fn().mockRejectedValue(databaseError);
    const service = new AddressService({
      address: { update },
    } as unknown as PrismaService);

    await expect(
      service.update(userId, addressId, { receiverName: "Bob" }),
    ).rejects.toBe(databaseError);
  });
});

describe("AddressService.setDefault", () => {
  it("switches the default within one transaction", async () => {
    const defaultAddress = address({ isDefault: true });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue(defaultAddress);
    const { service } = serviceWithTransaction({ updateMany, update });

    await expect(service.setDefault(userId, addressId)).resolves.toEqual({
      ok: true,
      address: defaultAddress,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: addressId, userId },
      data: { isDefault: true },
    });
  });

  it("returns ADDRESS_NOT_FOUND when the target is not owned", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockRejectedValue(notFoundError());
    const { service } = serviceWithTransaction({ updateMany, update });

    await expect(service.setDefault(userId, addressId)).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
    });
  });
});

describe("AddressService.delete", () => {
  it("does not promote another address after deleting the default", async () => {
    const deletedAddress = address({ isDefault: true });
    const deleteAddress = vi.fn().mockResolvedValue(deletedAddress);
    const service = new AddressService({
      address: { delete: deleteAddress },
    } as unknown as PrismaService);

    await expect(service.delete(userId, addressId)).resolves.toEqual({
      ok: true,
      address: deletedAddress,
    });
    expect(deleteAddress).toHaveBeenCalledWith({
      where: { id: addressId, userId },
    });
  });

  it("returns ADDRESS_NOT_FOUND without changing another user's address", async () => {
    const deleteAddress = vi.fn().mockRejectedValue(notFoundError());
    const service = new AddressService({
      address: { delete: deleteAddress },
    } as unknown as PrismaService);

    await expect(service.delete(userId, addressId)).resolves.toEqual({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
    });
  });
});
