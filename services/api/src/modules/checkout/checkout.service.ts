import { Injectable } from "@nestjs/common";
import { ErrorCode } from "../../common/errors/error-code";
import { PrismaService } from "../../prisma/prisma.service";
import { AddressService } from "../address/address.service";
import { CartService } from "../cart/cart.service";
import {
  OrderService,
  orderCreationFailure,
  type CreateOrderResult,
  type OrderRequestItem,
} from "../order/order.service";

export type CheckoutResult =
  | CreateOrderResult
  | {
      ok: false;
      errCode: ErrorCode.ADDRESS_NOT_FOUND;
      addressId: bigint;
    };

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressService: AddressService,
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
  ) {}

  async checkout(
    userId: bigint,
    addressId: bigint,
    items: readonly OrderRequestItem[],
  ): Promise<CheckoutResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const address = await this.addressService.findByIdForUser(
          userId,
          addressId,
          transaction,
        );

        if (!address) {
          return {
            ok: false as const,
            errCode: ErrorCode.ADDRESS_NOT_FOUND,
            addressId,
          };
        }

        const result = await this.orderService.createOrder(
          transaction,
          userId,
          address,
          items,
        );

        if (!result.ok) return result;

        await this.cartService.removeItems(
          userId,
          items.map((item) => item.skuId),
          transaction,
        );

        return result;
      });
    } catch (error) {
      const failure = orderCreationFailure(error);
      if (failure) return failure;

      throw error;
    }
  }
}
