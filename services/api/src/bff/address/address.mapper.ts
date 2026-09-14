import type { Address } from "../../generated/prisma/client";
import { AddressType } from "./address.type";

export function toAddressType(address: Address): AddressType {
  return {
    id: address.id.toString(),
    receiverName: address.receiverName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    isDefault: address.isDefault,
  };
}
