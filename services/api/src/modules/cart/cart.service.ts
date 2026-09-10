import { ErrorCode } from "../../common/errors/error-code";
import type { CartItem } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";

const MAX_CART_ITEM_QUANTITY = 99;

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

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addItem(
    userId: bigint,
    skuId: bigint,
    quantity: number,
  ): Promise<AddItemResult> {
    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_CART_ITEM_QUANTITY
    ) {
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

        if (item.quantity > MAX_CART_ITEM_QUANTITY) {
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
}
