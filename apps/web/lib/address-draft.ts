import { z } from "zod";
import type { AddressFormValues } from "@/lib/validation/address";

const ADDRESS_DRAFT_PREFIX = "reality-shop:address-draft:";
export const ADDRESS_DRAFT_TTL_MS = 30 * 60 * 1000;

const addressDraftSchema = z.object({
  expiresAt: z.number().int().positive(),
  values: z.object({
    receiverName: z.string(),
    phone: z.string(),
    province: z.string(),
    city: z.string(),
    district: z.string(),
    detail: z.string(),
    isDefault: z.boolean(),
  }),
});

export function addressDraftKey(userId: string, addressId?: string): string {
  return `${ADDRESS_DRAFT_PREFIX}${userId}:${addressId ?? "new"}`;
}

export function readAddressDraft(
  storage: Storage,
  key: string,
  now = Date.now(),
): AddressFormValues | null {
  try {
    const rawDraft = storage.getItem(key);
    if (!rawDraft) return null;

    const draft = addressDraftSchema.safeParse(JSON.parse(rawDraft));
    if (!draft.success || now >= draft.data.expiresAt) {
      storage.removeItem(key);
      return null;
    }

    return draft.data.values;
  } catch {
    clearAddressDraft(storage, key);
    return null;
  }
}

export function writeAddressDraft(
  storage: Storage,
  key: string,
  values: AddressFormValues,
  now = Date.now(),
) {
  try {
    storage.setItem(
      key,
      JSON.stringify({
        expiresAt: now + ADDRESS_DRAFT_TTL_MS,
        values,
      }),
    );
  } catch {
    // Storage can be unavailable; the form remains usable without recovery.
  }
}

export function clearAddressDraft(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable; there is nothing else to clear locally.
  }
}

export function clearAllAddressDrafts(storage: Storage) {
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(ADDRESS_DRAFT_PREFIX)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Storage can be unavailable; logout must continue regardless.
  }
}
