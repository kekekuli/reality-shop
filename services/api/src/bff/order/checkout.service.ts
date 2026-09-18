import { Injectable } from "@nestjs/common";
import { ErrorCode } from "../../common/errors/error-code";
import { AddressService } from "../../modules/address/address.service";
import {
  OrderService,
  type CreateOrderResult,
  type OrderRequestItem,
} from "../../modules/order/order.service";

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
    private readonly addressService: AddressService,
    private readonly orderService: OrderService,
  ) {}

  async checkout(
    userId: bigint,
    addressId: bigint,
    items: readonly OrderRequestItem[],
  ): Promise<CheckoutResult> {
    const address = await this.addressService.findByIdForUser(
      userId,
      addressId,
    );

    if (!address) {
      return {
        ok: false,
        errCode: ErrorCode.ADDRESS_NOT_FOUND,
        addressId,
      };
    }

    return this.orderService.createOrder(userId, address, items);
  }
}
