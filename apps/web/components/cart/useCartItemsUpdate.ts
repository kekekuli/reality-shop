import {
  CartItemUpdateStateFragment,
  RemoveCartItemMutation,
  UpdateCartItemMutation,
} from "@/lib/graphql/queries";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  classifyGraphQLRequestError,
  GraphQLRequestErrorKey,
} from "@/lib/graphql/errors";
import { PURCHASE_QUANTITY } from "@reality-shop/shared-types";
import type {
  ErrorCode,
  UpdateCartItemInput,
} from "@/lib/graphql/generated/graphql";
import type { Reference } from "@apollo/client";
import { pick } from "es-toolkit";

type FieldRule<T> = {
  validate?: (value: T) => ErrorCode | null;
};
type FieldRules<T> = {
  [K in keyof T]: FieldRule<T[K]>;
};
const CART_ITEM_FIELD_RULES: FieldRules<CartItemFields> = {
  quantity: {
    validate: (value) =>
      Number.isInteger(value) &&
      value >= PURCHASE_QUANTITY.min &&
      value <= PURCHASE_QUANTITY.max
        ? null
        : "INVALID_QUANTITY",
  },
  isSelected: {},
};

const CART_ITEM_UPDATE_FIELD_NAMES = Object.freeze(
  Object.keys(CART_ITEM_FIELD_RULES) as Array<keyof CartItemFields>,
);

const UPDATE_DELAY_MS = 250;

type CartItemFields = {
  [K in Exclude<keyof UpdateCartItemInput, "skuId">]-?: NonNullable<
    UpdateCartItemInput[K]
  >;
};

type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];

type PendingItemUpdate = {
  inFlight: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  confirmed: CartItemFields;
  desired: CartItemFields;
};

type ValueOrUpdater<T> = T | ((current: T) => T);
type CartItemUpdateFields = {
  [K in keyof CartItemFields]: ValueOrUpdater<CartItemFields[K]>;
};

type UpdatePatch = AtLeastOne<CartItemUpdateFields>;
type CartItemError = {
  skuId: string;
  key: ErrorCode | GraphQLRequestErrorKey;
};

export default function useCartItemsUpdate() {
  const client = useApolloClient();

  const [error, setError] = useState<CartItemError | null>(null);
  const itemUpdates = useRef(new Map<string, PendingItemUpdate>());
  const [updateCartItem] = useMutation(UpdateCartItemMutation);
  const [removeCartItem] = useMutation(RemoveCartItemMutation, {
    update(cache, { data }) {
      const payload = data?.removeCartItem;
      const removedSkuId = payload?.data?.skuId;

      if (!removedSkuId || payload.errors.length > 0) return;

      const cartId = cache.identify({ __typename: "CartType" });
      if (!cartId) return;

      cache.modify({
        id: cartId,
        fields: {
          items(existingItems: readonly Reference[] = [], { readField }) {
            return existingItems.filter(
              (item) => readField("skuId", item) !== removedSkuId,
            );
          },
        },
      });
    },
  });
  const writeCachedItem = useCallback(
    (skuId: string, state: CartItemFields) => {
      const cartItemId = client.cache.identify({
        __typename: "CartItemType",
        skuId,
      });

      if (!cartItemId) return;

      client.cache.modify({
        id: cartItemId,
        fields: {
          quantity: () => state.quantity,
          isSelected: () => state.isSelected,
        },
      });
    },
    [client],
  );
  useEffect(
    () => () => {
      for (const [skuId, update] of itemUpdates.current) {
        clearTimeout(update.timer);
        writeCachedItem(skuId, update.confirmed);
      }
      itemUpdates.current.clear();
    },
    [writeCachedItem],
  );
  function removeCachedItem(skuId: string) {
    const cartId = client.cache.identify({ __typename: "CartType" });
    if (!cartId) return;

    client.cache.modify({
      id: cartId,
      fields: {
        items(existingItems: readonly Reference[] = [], { readField }) {
          return existingItems.filter(
            (item) => readField("skuId", item) !== skuId,
          );
        },
      },
    });
  }

  function clearItemError(skuId: string) {
    setError((current) => (current?.skuId === skuId ? null : current));
  }
  function reportUpdateError(skuId: string, code?: ErrorCode) {
    switch (code) {
      case "INVALID_QUANTITY":
      case "CART_ITEM_NOT_FOUND":
      case "CART_ITEM_UPDATE_EMPTY":
        setError({ skuId, key: code });
        break;
      default:
        setError({ skuId, key: "unexpected" });
    }
  }
  function reportRequestError(skuId: string, requestError: unknown) {
    setError({ skuId, key: classifyGraphQLRequestError(requestError) });
  }

  async function flush(skuId: string, updateReq: PendingItemUpdate) {
    if (itemUpdates.current.get(skuId) !== updateReq) return;
    if (updateReq.inFlight) return;

    clearTimeout(updateReq.timer);
    updateReq.timer = undefined;

    if (stateEqual(updateReq.confirmed, updateReq.desired)) {
      itemUpdates.current.delete(skuId);
      return;
    }

    const confirmedBeforeSend = { ...updateReq.confirmed };
    const sentDesired = { ...updateReq.desired };

    let input: UpdateCartItemInput = {
      skuId,
    };
    let hasChanges = false;

    for (const key of CART_ITEM_UPDATE_FIELD_NAMES) {
      if (confirmedBeforeSend[key] !== sentDesired[key]) {
        hasChanges = true;
        input = {
          ...input,
          [key]: sentDesired[key],
        };
      }
    }

    if (!hasChanges) {
      itemUpdates.current.delete(skuId);
      return;
    }

    updateReq.inFlight = true;
    try {
      const result = await updateCartItem({
        variables: { input },
      });
      if (itemUpdates.current.get(skuId) !== updateReq) return;

      const payload = result.data?.updateCartItem;
      const errorCode = payload?.errors[0]?.code;

      if (errorCode) {
        updateReq.inFlight = false;
        itemUpdates.current.delete(skuId);

        if (errorCode === "CART_ITEM_NOT_FOUND") {
          removeCachedItem(skuId);
        } else {
          writeCachedItem(skuId, confirmedBeforeSend);
        }

        reportUpdateError(skuId, errorCode);
        return;
      }

      if (!payload?.data) {
        updateReq.inFlight = false;
        itemUpdates.current.delete(skuId);
        writeCachedItem(skuId, confirmedBeforeSend);
        reportUpdateError(skuId);
        return;
      }

      const serverState = pick(payload.data, CART_ITEM_UPDATE_FIELD_NAMES);
      const latestDesired = { ...updateReq.desired };
      let reconciledDesired = { ...serverState };

      for (const key of CART_ITEM_UPDATE_FIELD_NAMES) {
        if (latestDesired[key] !== sentDesired[key]) {
          reconciledDesired = {
            ...reconciledDesired,
            [key]: latestDesired[key],
          };
        }
      }

      updateReq.confirmed = serverState;
      updateReq.desired = reconciledDesired;
      updateReq.inFlight = false;
      writeCachedItem(skuId, reconciledDesired);
      clearItemError(skuId);

      if (stateEqual(updateReq.confirmed, updateReq.desired)) {
        itemUpdates.current.delete(skuId);
        return;
      }

      updateReq.timer = setTimeout(
        () => void flush(skuId, updateReq),
        UPDATE_DELAY_MS,
      );
    } catch (error) {
      if (itemUpdates.current.get(skuId) !== updateReq) return;

      updateReq.inFlight = false;
      itemUpdates.current.delete(skuId);
      writeCachedItem(skuId, confirmedBeforeSend);
      reportRequestError(skuId, error);
    }
  }

  function update(skuId: string, patch: UpdatePatch): void;
  function update(skuId: string, patch: Partial<CartItemUpdateFields>): void {
    let updateReq = itemUpdates.current.get(skuId);

    if (!updateReq) {
      const cartItemId = client.cache.identify({
        __typename: "CartItemType",
        skuId,
      });
      const cachedItem = client.readFragment({
        id: cartItemId,
        fragment: CartItemUpdateStateFragment,
      });

      if (!cachedItem) return;

      const initialState = pick(cachedItem, CART_ITEM_UPDATE_FIELD_NAMES);
      updateReq = {
        inFlight: false,
        timer: undefined,
        confirmed: { ...initialState },
        desired: { ...initialState },
      };
    }

    const nextDesired = { ...updateReq.desired };

    for (const key of CART_ITEM_UPDATE_FIELD_NAMES) {
      const errorCode = applyField(key);

      if (errorCode) {
        reportUpdateError(skuId, errorCode);
        return;
      }
    }

    updateReq.desired = nextDesired;
    itemUpdates.current.set(skuId, updateReq);

    clearItemError(skuId);
    writeCachedItem(skuId, nextDesired);

    if (updateReq.inFlight) return;
    if (stateEqual(updateReq.confirmed, updateReq.desired)) {
      clearTimeout(updateReq.timer);
      itemUpdates.current.delete(skuId);
      return;
    }

    clearTimeout(updateReq.timer);
    updateReq.timer = setTimeout(
      () => void flush(skuId, updateReq),
      UPDATE_DELAY_MS,
    );

    function applyField<K extends keyof CartItemUpdateFields>(key: K) {
      const valueOrUpdater = patch[key];

      if (valueOrUpdater === undefined) return;

      const current = nextDesired[key];

      nextDesired[key] = resolveValue(valueOrUpdater, current);

      return CART_ITEM_FIELD_RULES[key].validate?.(nextDesired[key]);
    }
  }

  async function remove(skuId: string): Promise<void> {
    const updateReq = itemUpdates.current.get(skuId);

    if (updateReq) {
      clearTimeout(updateReq.timer);
      itemUpdates.current.delete(skuId);
      writeCachedItem(skuId, updateReq.confirmed);
    }

    clearItemError(skuId);

    try {
      const result = await removeCartItem({
        variables: { input: { skuId } },
        optimisticResponse: {
          removeCartItem: {
            data: { skuId },
            errors: [],
          },
        },
      });
      const payload = result.data?.removeCartItem;
      const errorCode = payload?.errors[0]?.code;

      if (errorCode === "SKU_NOT_FOUND") {
        setError({ skuId, key: errorCode });
      } else if (errorCode || !payload?.data) {
        setError({ skuId, key: "unexpected" });
      }
    } catch (error) {
      reportRequestError(skuId, error);
    }
  }
  function resolveValue<T extends CartItemFields[keyof CartItemFields]>(
    valueOrUpdater: ValueOrUpdater<T>,
    current: T,
  ): T {
    return typeof valueOrUpdater === "function"
      ? valueOrUpdater(current)
      : valueOrUpdater;
  }

  function stateEqual(confirmed: CartItemFields, desired: CartItemFields) {
    return CART_ITEM_UPDATE_FIELD_NAMES.every(
      (key) => confirmed[key] === desired[key],
    );
  }

  return {
    errorKey: error?.key ?? null,
    update,
    remove,
  };
}
