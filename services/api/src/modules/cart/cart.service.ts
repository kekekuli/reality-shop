import { ErrorCode } from "../../common/errors/error-code";
import type { CartItem } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { CART_ITEM_QUANTITY } from "@reality-shop/shared-types";

class CartQuantityLimitExceededError extends Error {}

export type AddItemResult =
  | {
      ok: false;
      errCode:
        | ErrorCode.SKU_NOT_FOUND
        | ErrorCode.INVALID_QUANTITY
        | ErrorCode.CART_QUANTITY_LIMIT_EXCEED;
    }
  | {
      ok: true;
      cartItem: CartItem;
    };

export type UpdateItemQuantityResult =
  | {
      ok: false;
      errCode: ErrorCode.INVALID_QUANTITY | ErrorCode.CART_ITEM_NOT_FOUND;
    }
  | {
      ok: true;
      cartItem: CartItem;
    };

function isValidQuantity(quantity: number): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity >= CART_ITEM_QUANTITY.min &&
    quantity <= CART_ITEM_QUANTITY.max
  );
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addItem(
    userId: bigint,
    skuId: bigint,
    quantity: number,
  ): Promise<AddItemResult> {
    if (!isValidQuantity(quantity)) {
      return {
        ok: false,
        errCode: ErrorCode.INVALID_QUANTITY,
      };
    }

    const sku = await this.prisma.sku.findUnique({
      where: {
        id: skuId,
      },
    });

    if (!sku) {
      return {
        ok: false,
        errCode: ErrorCode.SKU_NOT_FOUND,
      };
    }

    try {
      const cartItem = await this.prisma.$transaction(async (transaction) => {
        const item = await transaction.cartItem.upsert({
          where: {
            userId_skuId: { userId, skuId },
          },
          create: { userId, skuId, quantity },
          update: {
            quantity: { increment: quantity },
          },
        });

        if (item.quantity > CART_ITEM_QUANTITY.max) {
          throw new CartQuantityLimitExceededError();
        }

        return item;
      });

      return {
        ok: true,
        cartItem,
      };
    } catch (error) {
      if (!(error instanceof CartQuantityLimitExceededError)) {
        throw error;
      }

      return {
        ok: false,
        errCode: ErrorCode.CART_QUANTITY_LIMIT_EXCEED,
      };
    }
  }

  async listItems(userId: bigint): Promise<CartItem[]> {
    return this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { skuId: "asc" }],
    });
  }

  async updateItemQuantity(
    userId: bigint,
    skuId: bigint,
    quantity: number,
  ): Promise<UpdateItemQuantityResult> {
    if (!isValidQuantity(quantity)) {
      return { ok: false, errCode: ErrorCode.INVALID_QUANTITY };
    }

    try {
      const cartItem = await this.prisma.cartItem.update({
        where: { userId_skuId: { userId, skuId } },
        data: { quantity },
      });

      return { ok: true, cartItem };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return { ok: false, errCode: ErrorCode.CART_ITEM_NOT_FOUND };
      }

      throw error;
    }
  }

  async removeItem(userId: bigint, skuId: bigint): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { userId, skuId },
    });
  }
}
