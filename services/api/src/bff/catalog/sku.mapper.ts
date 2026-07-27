import { Sku } from "./sku.type";
import { Sku as PrismaSku } from "../../generated/prisma/client";

export function toSku(s: PrismaSku): Sku {
  return {
    skuCode: s.skuCode,
    price: s.priceCents,
  };
}
