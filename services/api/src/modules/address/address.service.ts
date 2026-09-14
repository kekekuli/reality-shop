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
    return this.prisma.$transaction(async (transaction) => {
      const existingAddress = await transaction.address.findFirst({
        where: { userId },
        select: { id: true },
      });
      const shouldBeDefault = data.isDefault === true || !existingAddress;

      if (shouldBeDefault) {
        await transaction.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return transaction.address.create({
        data: {
          ...data,
          userId,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async update(
    userId: bigint,
    addressId: bigint,
    data: Partial<
      Omit<
        Prisma.AddressUncheckedCreateInput,
        "id" | "userId" | "isDefault" | "createdAt" | "updatedAt"
      >
    >,
  ) {
    try {
      const address = await this.prisma.address.update({
        where: { id: addressId, userId },
        data,
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
    try {
      const address = await this.prisma.$transaction(async (transaction) => {
        await transaction.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });

        return transaction.address.update({
          where: { id: addressId, userId },
          data: { isDefault: true },
        });
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

  async delete(userId: bigint, addressId: bigint) {
    try {
      const address = await this.prisma.$transaction(async (transaction) => {
        const deletedAddress = await transaction.address.delete({
          where: { id: addressId, userId },
        });

        if (deletedAddress.isDefault) {
          const nextDefault = await transaction.address.findFirst({
            where: { userId },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true },
          });

          if (nextDefault) {
            await transaction.address.update({
              where: { id: nextDefault.id },
              data: { isDefault: true },
            });
          }
        }

        return deletedAddress;
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
