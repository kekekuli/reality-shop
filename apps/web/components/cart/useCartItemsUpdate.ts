import { useState, useRef, useEffect, useCallback } from "react";
import type { ErrorCode } from "@/lib/graphql/generated/graphql";
import type { UpdateCartItemInput } from "@/lib/graphql/generated/graphql";
import { useApolloClient } from "@apollo/client/react";
import { CartItemUpdateStateFragment } from "@/lib/graphql/queries";
import { PURCHASE_QUANTITY } from "@reality-shop/shared-types";
import {
  UpdateCartItemMutation,
  RemoveCartItemMutation,
} from "@/lib/graphql/queries";
import { useMutation } from "@apollo/client/react";
import { isErrorLike } from "@apollo/client/errors";
import { classifyGraphQLRequestError } from "@/lib/graphql/errors";
import type { Reference } from "@apollo/client";

type UpdateableFields = Exclude<keyof UpdateCartItemInput, "skuId">;
type ValueOrUpdater<T> = T | ((current: T) => T);

type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never;

type FieldsUpdater = {
  [K in UpdateableFields]: ValueOrUpdater<FieldValueType<K>>;
};

type UpdatePatch = AtLeastOne<FieldsUpdater, UpdateableFields>;

type FieldValueType<K extends UpdateableFields> = NonNullable<
  UpdateCartItemInput[K]
>;

type FieldsCollection = {
  [K in UpdateableFields]: FieldValueType<K>;
};

type CartItemError = {
  skuId: string;
  code: ErrorCode;
};

interface PendingState {
  confirmed: FieldsCollection;
  desired: FieldsCollection;
  timer: ReturnType<typeof setTimeout> | undefined;
  inFlight: boolean;
}

const validator: {
  [K in UpdateableFields]?: (
    value: FieldValueType<K>,
  ) => ErrorCode | null;
} = {
  quantity: (value) =>
    Number.isInteger(value) &&
    value <= PURCHASE_QUANTITY.max &&
    value >= PURCHASE_QUANTITY.min
      ? null
      : "INVALID_QUANTITY",
  isSelected: (value) => (typeof value === "boolean" ? null : "UNEXPECTED"),
};

const DEBOUNCE_DELAY = 250; // ms

export default function useCartItemsUpdate() {
  const [error, setError] = useState<CartItemError | null>(null);
  const requests = useRef<Record<string, PendingState>>({});

  const client = useApolloClient();

  const writeCartItemToCache = useCallback(
    (sku: string, data: FieldsCollection) => {
      const cacheId = client.cache.identify({
        __typename: "CartItemType",
        skuId: sku,
      });
      if (!cacheId) return;

      client.cache.writeFragment({
        id: cacheId,
        fragment: CartItemUpdateStateFragment,
        data: {
          skuId: sku,
          ...data,
        },
      });
    },
    [client],
  );

  useEffect(() => {
    return () => {
      for (const [skuId, pendingState] of Object.entries(requests.current)) {
        if (pendingState.timer !== undefined) {
          clearTimeout(pendingState.timer);
        }

        if (defer(pendingState.confirmed, pendingState.desired)) {
          writeCartItemToCache(skuId, pendingState.confirmed);
        }
      }

      requests.current = {};
    };
  }, [writeCartItemToCache]);

  const [updateCartItem] = useMutation(UpdateCartItemMutation);
  const [removeCartItem] = useMutation(RemoveCartItemMutation, {
    update(cache, { data }) {
      const payload = data?.removeCartItem;
      const removeSkuId = data?.removeCartItem.data?.skuId;

      if (!removeSkuId || (payload && payload.errors.length > 0)) return;
      const cartId = cache.identify({ __typename: "CartType" });
      if (!cartId) return;

      cache.modify({
        id: cartId,
        fields: {
          items(existingItems: readonly Reference[] = [], { readField }) {
            return existingItems.filter(
              (item) => readField("skuId", item) !== removeSkuId,
            );
          },
        },
      });
    },
  });

  function clearItemError(skuId: string) {
    setError((current) => (current?.skuId === skuId ? null : current));
  }

  async function flush(skuId: string, pendingState: PendingState) {
    pendingState.timer = undefined;

    if (requests.current[skuId] !== pendingState) {
      return;
    }
    if (pendingState.inFlight) {
      return;
    }

    const cacheId = client.cache.identify({
      __typename: "CartItemType",
      skuId,
    });
    if (!cacheId) return;

    const mutationDefer = defer(pendingState.desired, pendingState.confirmed);

    if (mutationDefer) {
      requests.current[skuId].inFlight = true;
      const sentDesired = { ...pendingState.desired };

      try {
        const res = await updateCartItem({
          variables: {
            input: {
              skuId,
              ...mutationDefer,
            },
          },
        });
        if (requests.current[skuId] !== pendingState) return;

        const error = res.error ?? res.data?.updateCartItem.errors[0]?.code;
        if (error) {
          throw error;
        }

        const data = res.data?.updateCartItem.data;
        if (!data) throw "UNEXPECTED" as ErrorCode;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { skuId: _skuid, ...serverState } = data;
        pendingState.confirmed = serverState;
        const lastDesired = { ...pendingState.desired };
        const trailingRequestDefer = defer(lastDesired, sentDesired);

        const reconciledState = { ...serverState, ...trailingRequestDefer }; // for write back to apollo client cache

        writeCartItemToCache(skuId, reconciledState);

        pendingState.desired = reconciledState;
        pendingState.inFlight = false;
        clearItemError(skuId);

        if (trailingRequestDefer) {
          pendingState.timer = setTimeout(
            () => void flush(skuId, pendingState),
            DEBOUNCE_DELAY,
          );

          return;
        }
      } catch (e) {
        if (requests.current[skuId] !== pendingState) return;

        const errorCode = isErrorLike(e)
          ? classifyGraphQLRequestError(e)
          : (e as ErrorCode);

        pendingState.inFlight = false;
        if (errorCode === "CART_ITEM_NOT_FOUND") {
          // remove that item from Cart cache, not Cart Item Cache
          const cartId = client.cache.identify({
            __typename: "CartType",
          });
          if (cartId) {
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
        } else {
          pendingState.desired = { ...pendingState.confirmed };
          writeCartItemToCache(skuId, pendingState.confirmed);
        }

        setError({ skuId, code: errorCode });
      }
    }

    delete requests.current[skuId];
  }

  function update(skuId: string, patch: UpdatePatch) {
    const cacheId = client.cache.identify({
      __typename: "CartItemType",
      skuId,
    });
    if (!cacheId) return;

    // Find the skuID current state or construct it;
    const pendingState = readPendingState(skuId);
    if (!pendingState) return;
    // Apply the desired state to Apollo's cache immediately.
    const nextDesired = { ...pendingState.desired };
    for (const key of Object.keys(patch) as UpdateableFields[]) {
      const value = patch[key];

      if (value === undefined) continue;

      applyUpdater(
        nextDesired,
        key,
        value as ValueOrUpdater<FieldValueType<typeof key>>,
      );

      const validate = validator[key] as
        | ((value: (typeof nextDesired)[typeof key]) => ErrorCode | null)
        | undefined;
      const errorCode = validate?.(nextDesired[key]);
      if (errorCode) {
        setError({ skuId, code: errorCode });
        return;
      }
    }
    requests.current[skuId] = pendingState;

    clearItemError(skuId);
    writeCartItemToCache(skuId, nextDesired);
    pendingState.desired = nextDesired;

    // Store the pending change and debounce the network request.
    clearTimeout(pendingState.timer);
    pendingState.timer = undefined;
    if (pendingState.inFlight) {
      // trailing request handled by 'flush' function, not here
      return;
    }

    pendingState.timer = setTimeout(() => {
      void flush(skuId, pendingState);
    }, DEBOUNCE_DELAY);
  }

  function readPendingState(skuId: string): PendingState | undefined {
    if (requests.current[skuId]) {
      return requests.current[skuId];
    } else {
      // read from apollo cache as its init state
      const cacheId = client.cache.identify({
        __typename: "CartItemType",
        skuId,
      });

      if (!cacheId) {
        return;
      }
      const item = client.readFragment({
        id: cacheId,
        fragment: CartItemUpdateStateFragment,
      });

      if (!item) return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { skuId: _skuId, ...fieldsCollection } = item;

      return {
        confirmed: fieldsCollection,
        desired: { ...fieldsCollection },
        timer: undefined,
        inFlight: false,
      };
    }
  }

  async function remove(skuId: string) {
    const existingRequest = requests.current[skuId];
    if (existingRequest) {
      clearTimeout(existingRequest.timer);
      delete requests.current[skuId];

      writeCartItemToCache(skuId, existingRequest.confirmed);
    }

    clearItemError(skuId);

    try {
      const res = await removeCartItem({
        variables: {
          input: {
            skuId,
          },
        },
        optimisticResponse: {
          removeCartItem: {
            data: {
              skuId,
            },
            errors: [],
          },
        },
      });

      if (res.error) throw res.error;

      const payload = res.data?.removeCartItem;
      const errorCode = payload?.errors[0]?.code;

      if (errorCode === "SKU_NOT_FOUND") {
        setError({ skuId, code: errorCode });
      } else if (errorCode || !payload?.data) {
        setError({ skuId, code: "UNEXPECTED" });
      }
    } catch (e) {
      const errorCode = isErrorLike(e)
        ? classifyGraphQLRequestError(e)
        : (e as ErrorCode);

      setError({ skuId, code: errorCode });
    }
  }

  return {
    update,
    remove,
    errorKey: error?.code ?? null,
  };
}

function resolveValue<T>(current: T, value: ValueOrUpdater<T>): T {
  // avoid T is type of function
  if (typeof value === "function") {
    return (value as (current: T) => T)(current);
  }

  return value;
}

function applyUpdater<T extends object, K extends keyof T>(
  state: T,
  key: K,
  value: ValueOrUpdater<T[K]>,
): void {
  state[key] = resolveValue<T[K]>(state[key], value);
}

function defer<T extends object>(
  source: T,
  excepted: T,
): Partial<T> | undefined {
  const result: Partial<T> = {};
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (source[key] !== excepted[key]) {
      result[key] = source[key];
    }
  }
  return Object.keys(result).length ? result : undefined;
}
