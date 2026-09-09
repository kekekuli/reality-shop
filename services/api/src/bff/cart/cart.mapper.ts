import { CartItem } from "../../generated/prisma/client";
import { CartItemType } from "./cart.type";

export function toCartItemType(item: CartItem): CartItemType {
  return {
    skuId: item.skuId.toString(),
    quantity: item.quantity,
  };
}
