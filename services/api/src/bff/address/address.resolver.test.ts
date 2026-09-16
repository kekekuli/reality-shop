import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../common/errors/error-code";
import type { Address } from "../../generated/prisma/client";
import type { AddressService } from "../../modules/address/address.service";
import type { AuthenticatedRequest } from "../auth/gql-auth.guard";
import { AddressResolver } from "./address.resolver";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
  },
}));

const userId = 42n;
const timestamp = new Date("2026-01-01T00:00:00.000Z");
const input = {
  receiverName: "Alice",
  phone: "123456789",
  province: "Province",
  city: "City",
  district: "District",
  detail: "Street 1",
};
const address: Address = {
  id: 7n,
  userId,
  ...input,
  isDefault: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function authenticatedRequest(): AuthenticatedRequest {
  return { auth: { userId } } as AuthenticatedRequest;
}

describe("AddressResolver.addresses", () => {
  it("returns the authenticated user's mapped addresses", async () => {
    const findByUserId = vi.fn().mockResolvedValue([address]);
    const resolver = new AddressResolver({
      findByUserId,
    } as unknown as AddressService);

    await expect(resolver.addresses(authenticatedRequest())).resolves.toEqual([
      {
        id: "7",
        ...input,
        isDefault: true,
      },
    ]);
    expect(findByUserId).toHaveBeenCalledWith(userId);
  });
});

describe("AddressResolver.createAddress", () => {
  it("creates an address for the authenticated user and wraps the result", async () => {
    const create = vi.fn().mockResolvedValue(address);
    const resolver = new AddressResolver({
      create,
    } as unknown as AddressService);

    await expect(
      resolver.createAddress(input, authenticatedRequest()),
    ).resolves.toEqual({
      data: {
        id: "7",
        ...input,
        isDefault: true,
      },
      errors: [],
    });
    expect(create).toHaveBeenCalledWith(userId, input);
  });
});

describe("AddressResolver.updateAddress", () => {
  it("updates an address owned by the authenticated user", async () => {
    const updatedAddress = { ...address, receiverName: "Bob" };
    const update = vi.fn().mockResolvedValue({
      ok: true,
      address: updatedAddress,
    });
    const resolver = new AddressResolver({
      update,
    } as unknown as AddressService);

    await expect(
      resolver.updateAddress(
        { addressId: "7", receiverName: "Bob", isDefault: true },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      data: {
        id: "7",
        ...input,
        receiverName: "Bob",
        isDefault: true,
      },
      errors: [],
    });
    expect(update).toHaveBeenCalledWith(userId, 7n, {
      receiverName: "Bob",
      isDefault: true,
    });
  });

  it("maps a missing or unowned address to a business error", async () => {
    const update = vi.fn().mockResolvedValue({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
    });
    const resolver = new AddressResolver({
      update,
    } as unknown as AddressService);

    await expect(
      resolver.updateAddress(
        { addressId: "7", receiverName: "Bob" },
        authenticatedRequest(),
      ),
    ).resolves.toEqual({
      errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }],
    });
  });
});

describe("AddressResolver.setDefaultAddress", () => {
  it("sets an owned address as the default", async () => {
    const setDefault = vi.fn().mockResolvedValue({
      ok: true,
      address,
    });
    const resolver = new AddressResolver({
      setDefault,
    } as unknown as AddressService);

    await expect(
      resolver.setDefaultAddress({ addressId: "7" }, authenticatedRequest()),
    ).resolves.toEqual({
      data: { id: "7", ...input, isDefault: true },
      errors: [],
    });
    expect(setDefault).toHaveBeenCalledWith(userId, 7n);
  });

  it("maps a missing or unowned address to a business error", async () => {
    const setDefault = vi.fn().mockResolvedValue({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
    });
    const resolver = new AddressResolver({
      setDefault,
    } as unknown as AddressService);

    await expect(
      resolver.setDefaultAddress({ addressId: "7" }, authenticatedRequest()),
    ).resolves.toEqual({
      errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }],
    });
  });
});

describe("AddressResolver.deleteAddress", () => {
  it("deletes an owned address and returns the deleted address", async () => {
    const deleteAddress = vi.fn().mockResolvedValue({
      ok: true,
      address,
    });
    const resolver = new AddressResolver({
      delete: deleteAddress,
    } as unknown as AddressService);

    await expect(
      resolver.deleteAddress({ addressId: "7" }, authenticatedRequest()),
    ).resolves.toEqual({
      data: { id: "7", ...input, isDefault: true },
      errors: [],
    });
    expect(deleteAddress).toHaveBeenCalledWith(userId, 7n);
  });

  it("maps a missing or unowned address to a business error", async () => {
    const deleteAddress = vi.fn().mockResolvedValue({
      ok: false,
      errCode: ErrorCode.ADDRESS_NOT_FOUND,
    });
    const resolver = new AddressResolver({
      delete: deleteAddress,
    } as unknown as AddressService);

    await expect(
      resolver.deleteAddress({ addressId: "7" }, authenticatedRequest()),
    ).resolves.toEqual({
      errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }],
    });
  });
});

describe("AddressResolver address ID validation", () => {
  it.each([
    ["updateAddress", "update"],
    ["setDefaultAddress", "setDefault"],
    ["deleteAddress", "delete"],
  ] as const)(
    "rejects an invalid ID before %s calls the service",
    async (resolverMethod, serviceMethod) => {
      const serviceCall = vi.fn();
      const resolver = new AddressResolver({
        [serviceMethod]: serviceCall,
      } as unknown as AddressService);
      const request = authenticatedRequest();

      const result =
        resolverMethod === "updateAddress"
          ? await resolver.updateAddress(
              { addressId: "not-an-id" },
              request,
            )
          : resolverMethod === "setDefaultAddress"
            ? await resolver.setDefaultAddress(
                { addressId: "not-an-id" },
                request,
              )
            : await resolver.deleteAddress(
                { addressId: "not-an-id" },
                request,
              );

      expect(result).toEqual({
        errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }],
      });
      expect(serviceCall).not.toHaveBeenCalled();
    },
  );
});
