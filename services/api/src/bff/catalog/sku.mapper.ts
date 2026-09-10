import { Sku } from "./sku.type";
import { Sku as PrismaSku } from "../../generated/prisma/client";

export function toSku(s: PrismaSku): Sku {
  return {
    skuId: s.id.toString(),
    skuCode: s.skuCode,
    price: s.priceCents,
  };
}
