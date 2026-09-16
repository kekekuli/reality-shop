import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ErrorCode } from "../../common/errors/error-code";
import { PrismaService } from "../../prisma/prisma.service";
import type { Prisma } from "../../generated/prisma/client";

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof PrismaClientKnownRequestError && error.code === "P2025"
  );
}

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: bigint) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  }

  async create(
    userId: bigint,
    data: Omit<
      Prisma.AddressUncheckedCreateInput,
      "id" | "userId" | "createdAt" | "updatedAt"
    >,
  ) {
    if (data.isDefault === true) {
      return this.prisma.$transaction(async (transaction) => {
        await transaction.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });

        return transaction.address.create({
          data: { ...data, userId, isDefault: true },
        });
      });
    }

    return this.prisma.address.create({
      data: { ...data, userId, isDefault: false },
    });
  }

  async update(
    userId: bigint,
    addressId: bigint,
    data: Partial<
      Omit<
        Prisma.AddressUncheckedCreateInput,
        "id" | "userId" | "createdAt" | "updatedAt"
      >
    >,
  ) {
    try {
      const { isDefault, ...addressDetails } = data;
      const address = isDefault === true
        ? await this.prisma.$transaction(async (transaction) => {
            await transaction.address.updateMany({
              where: { userId, isDefault: true },
              data: { isDefault: false },
            });

            return transaction.address.update({
              where: { id: addressId, userId },
              data: { ...addressDetails, isDefault: true },
            });
          })
        : await this.prisma.address.update({
            where: { id: addressId, userId },
            data:
              isDefault === false
                ? { ...addressDetails, isDefault: false }
                : addressDetails,
          });

      return { ok: true as const, address };
    } catch (error) {
      if (isRecordNotFound(error)) {
        return {
          ok: false as const,
          errCode: ErrorCode.ADDRESS_NOT_FOUND,
        };
      }

      throw error;
    }
  }

  async setDefault(userId: bigint, addressId: bigint) {
    return this.update(userId, addressId, { isDefault: true });
  }

  async delete(userId: bigint, addressId: bigint) {
    try {
      const address = await this.prisma.address.delete({
        where: { id: addressId, userId },
      });

      return { ok: true as const, address };
    } catch (error) {
      if (isRecordNotFound(error)) {
        return {
          ok: false as const,
          errCode: ErrorCode.ADDRESS_NOT_FOUND,
        };
      }

      throw error;
    }
  }
}
