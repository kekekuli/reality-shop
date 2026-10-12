import {
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
  CartQuery as CartQueryData,
  ErrorCode,
} from "@/lib/graphql/generated/graphql";
import type { Reference } from "@apollo/client";
const QUANTITY_UPDATE_DELAY_MS = 250;

type QuantityItem = Pick<
  CartQueryData["cart"]["items"][number],
  "skuId" | "quantity"
>;

type PendingQuantityUpdate = {
  confirmed: number;
  desired: number;
  inFlight: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

export default function useCartItemsUpdate() {
  const client = useApolloClient();

  const [errorKey, setErrorKey] = useState<
    ErrorCode | GraphQLRequestErrorKey | null
  >(null);
  const quantityUpdates = useRef(new Map<string, PendingQuantityUpdate>());
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
  const writeCachedQuantity = useCallback(
    (skuId: string, quantity: number) => {
      const cartItemId = client.cache.identify({
        __typename: "CartItemType",
        skuId,
      });
      if (!cartItemId) return;

      client.cache.modify({
        id: cartItemId,
        fields: {
          quantity: () => quantity,
        },
      });
    },
    [client],
  );

  useEffect(
    () => () => {
      for (const [skuId, update] of quantityUpdates.current) {
        if (update.timer) clearTimeout(update.timer);
        writeCachedQuantity(skuId, update.confirmed);
      }
      quantityUpdates.current.clear();
    },
    [writeCachedQuantity],
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

  function reportQuantityError(code?: string) {
    switch (code) {
      case "INVALID_QUANTITY":
      case "CART_ITEM_NOT_FOUND":
        setErrorKey(code);
        break;
      default:
        setErrorKey("unexpected");
    }
  }
  function reportRequestError(error: unknown) {
    setErrorKey(classifyGraphQLRequestError(error));
  }

  async function flushQuantityUpdate(
    skuId: string,
    update: PendingQuantityUpdate,
  ) {
    if (quantityUpdates.current.get(skuId) !== update || update.inFlight) {
      return;
    }

    update.timer = null;
    update.inFlight = true;
    const sentQuantity = update.desired;

    try {
      const result = await updateCartItem({
        variables: { input: { skuId, quantity: sentQuantity } },
      });

      if (quantityUpdates.current.get(skuId) !== update) return;

      const payload = result.data?.updateCartItem;
      const errorCode = payload?.errors[0]?.code;

      if (errorCode || !payload?.data) {
        quantityUpdates.current.delete(skuId);

        if (errorCode === "CART_ITEM_NOT_FOUND") {
          removeCachedItem(skuId);
        } else {
          writeCachedQuantity(skuId, update.confirmed);
        }

        reportQuantityError(errorCode);
        return;
      }

      update.confirmed = payload.data.quantity;
      update.inFlight = false;

      if (update.desired !== sentQuantity) {
        update.timer = setTimeout(
          () => void flushQuantityUpdate(skuId, update),
          QUANTITY_UPDATE_DELAY_MS,
        );
      } else {
        quantityUpdates.current.delete(skuId);
        writeCachedQuantity(skuId, payload.data.quantity);
      }
    } catch (error) {
      if (quantityUpdates.current.get(skuId) !== update) return;

      quantityUpdates.current.delete(skuId);
      writeCachedQuantity(skuId, update.confirmed);
      reportRequestError(error);
    }
  }
  function queueQuantityUpdate(
    skuId: string,
    confirmedQuantity: number,
    desiredQuantity: number,
  ) {
    if (
      !Number.isInteger(desiredQuantity) ||
      desiredQuantity < PURCHASE_QUANTITY.min ||
      desiredQuantity > PURCHASE_QUANTITY.max
    ) {
      return;
    }

    setErrorKey(null);
    let update = quantityUpdates.current.get(skuId);

    if (!update) {
      update = {
        confirmed: confirmedQuantity,
        desired: desiredQuantity,
        inFlight: false,
        timer: null,
      };
      quantityUpdates.current.set(skuId, update);
    } else {
      update.desired = desiredQuantity;
    }

    writeCachedQuantity(skuId, desiredQuantity);

    if (update.inFlight) return;
    if (update.timer) clearTimeout(update.timer);

    update.timer = setTimeout(
      () => void flushQuantityUpdate(skuId, update),
      QUANTITY_UPDATE_DELAY_MS,
    );
  }
  function changeQuantity(item: QuantityItem, delta: number) {
    const desiredQuantity =
      quantityUpdates.current.get(item.skuId)?.desired ?? item.quantity;

    queueQuantityUpdate(item.skuId, item.quantity, desiredQuantity + delta);
  }
  function cancelQuantityUpdate(skuId: string) {
    const update = quantityUpdates.current.get(skuId);
    if (!update) return;
    if (update.timer) clearTimeout(update.timer);
    quantityUpdates.current.delete(skuId);
    writeCachedQuantity(skuId, update.confirmed);
  }
  async function handleRemoveItem(skuId: string) {
    cancelQuantityUpdate(skuId);
    setErrorKey(null);

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
        setErrorKey(errorCode);
      } else if (errorCode || !payload?.data) {
        setErrorKey("unexpected");
      }
    } catch (error) {
      reportRequestError(error);
    }
  }

  return {
    errorKey,
    changeQuantity,
    queueQuantityUpdate,
    cancelQuantityUpdate,
    handleRemoveItem,
  };
}
