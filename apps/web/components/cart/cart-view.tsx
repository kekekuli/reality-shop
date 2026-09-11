"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import type { Reference } from "@apollo/client";
import {
  useApolloClient,
  useMutation,
  useSuspenseQuery,
} from "@apollo/client/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getPathname } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { CART_ITEM_QUANTITY } from "@reality-shop/shared-types";
import type { CartQuery as CartQueryData } from "@/lib/graphql/generated/graphql";
import {
  CartQuery,
  RemoveCartItemMutation,
  UpdateCartItemQuantityMutation,
} from "@/lib/graphql/queries";

const QUANTITY_UPDATE_DELAY_MS = 250;

type CartViewProps = {
  locale: string;
};

type CartItem = CartQueryData["cart"]["items"][number];

type PendingQuantityUpdate = {
  confirmed: number;
  desired: number;
  inFlight: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

function useCartItems() {
  return useSuspenseQuery(CartQuery).data.cart.items;
}

function totalPrice(items: readonly CartItem[]) {
  const cents = items.reduce(
    (total, item) => total + BigInt(item.sku.price) * BigInt(item.quantity),
    BigInt(0),
  );

  return formatPrice(cents.toString());
}

export function CartView({ locale }: CartViewProps) {
  const t = useTranslations("cart");
  const errorT = useTranslations("error");
  const client = useApolloClient();
  const items = useCartItems();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const quantityUpdates = useRef(new Map<string, PendingQuantityUpdate>());
  const [updateCartItemQuantity] = useMutation(
    UpdateCartItemQuantityMutation,
  );
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
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = totalPrice(items);

  useEffect(
    () => () => {
      for (const update of quantityUpdates.current.values()) {
        if (update.timer) clearTimeout(update.timer);
      }
      quantityUpdates.current.clear();
    },
    [],
  );

  function writeCachedQuantity(skuId: string, quantity: number) {
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
  }

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
        setErrorMessage(errorT(code));
        break;
      default:
        setErrorMessage(errorT("unexpected"));
    }
  }

  function reportRequestError(error: unknown) {
    if (CombinedGraphQLErrors.is(error)) {
      const isUnauthenticated = error.errors.some(
        (graphQLError) => graphQLError.extensions?.code === "UNAUTHENTICATED",
      );
      setErrorMessage(
        errorT(isUnauthenticated ? "UNAUTHENTICATED" : "unexpected"),
      );
    } else {
      setErrorMessage(errorT("network"));
    }
  }

  async function flushQuantityUpdate(
    skuId: string,
    update: PendingQuantityUpdate,
  ) {
    if (
      quantityUpdates.current.get(skuId) !== update ||
      update.inFlight
    ) {
      return;
    }

    update.timer = null;
    update.inFlight = true;
    const sentQuantity = update.desired;

    try {
      const result = await updateCartItemQuantity({
        variables: { input: { skuId, quantity: sentQuantity } },
      });

      if (quantityUpdates.current.get(skuId) !== update) return;

      const payload = result.data?.updateCartItemQuantity;
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
      desiredQuantity < CART_ITEM_QUANTITY.min ||
      desiredQuantity > CART_ITEM_QUANTITY.max
    ) {
      return;
    }

    setErrorMessage(null);
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

  function changeQuantity(item: CartItem, delta: number) {
    const desiredQuantity =
      quantityUpdates.current.get(item.skuId)?.desired ?? item.quantity;

    queueQuantityUpdate(
      item.skuId,
      item.quantity,
      desiredQuantity + delta,
    );
  }

  function cancelQuantityUpdate(skuId: string) {
    const update = quantityUpdates.current.get(skuId);
    if (update?.timer) clearTimeout(update.timer);
    quantityUpdates.current.delete(skuId);
  }

  async function handleRemoveItem(skuId: string) {
    cancelQuantityUpdate(skuId);
    setErrorMessage(null);

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
        setErrorMessage(errorT(errorCode));
      } else if (errorCode || !payload?.data) {
        setErrorMessage(errorT("unexpected"));
      }
    } catch (error) {
      reportRequestError(error);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("itemCount", { count: itemCount })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
        </div>

        <Link
          href={getPathname({ href: "/", locale })}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("continueShopping")}
        </Link>
      </header>

      {errorMessage && <FieldError className="mt-4">{errorMessage}</FieldError>}

      {items.length === 0 ? (
        <Card className="mt-8 items-center py-12 text-center">
          <CardContent className="flex max-w-md flex-col items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ShoppingCart aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle as="h2" className="text-lg">
                {t("emptyTitle")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("emptyDescription")}
              </CardDescription>
            </div>
            <Link
              href={getPathname({ href: "/", locale })}
              className={buttonVariants()}
            >
              {t("browseProducts")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ul className="space-y-4" aria-label={t("items")}>
            {items.map((item) => {
              const lineTotal = formatPrice(
                (BigInt(item.sku.price) * BigInt(item.quantity)).toString(),
              );

              return (
                <li key={item.skuId}>
                  <Card>
                    <CardContent className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.sku.product.brand}
                        </p>
                        <Link
                          href={getPathname({
                            href: `/products/${item.sku.product.slug}`,
                            locale,
                          })}
                          className="mt-1 inline-block text-base font-medium underline-offset-4 hover:underline"
                        >
                          {item.sku.product.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("skuCode", { code: item.sku.skuCode })}
                        </p>
                        <p className="mt-3 text-sm">
                          {t("unitPrice", {
                            price: formatPrice(item.sku.price),
                          })}
                        </p>
                      </div>

                      <p className="font-semibold sm:text-right">{lineTotal}</p>

                      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={
                              item.quantity <= CART_ITEM_QUANTITY.min
                            }
                            aria-label={t("decreaseItemQuantity", {
                              sku: item.sku.skuCode,
                            })}
                            onClick={() => changeQuantity(item, -1)}
                          >
                            <Minus aria-hidden="true" />
                          </Button>
                          <Input
                            className="h-7 w-16 text-center"
                            type="number"
                            min={CART_ITEM_QUANTITY.min}
                            max={CART_ITEM_QUANTITY.max}
                            step="1"
                            inputMode="numeric"
                            value={item.quantity}
                            aria-label={t("itemQuantity", {
                              sku: item.sku.skuCode,
                            })}
                            onChange={(event) =>
                              queueQuantityUpdate(
                                item.skuId,
                                item.quantity,
                                Number(event.target.value),
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={
                              item.quantity >= CART_ITEM_QUANTITY.max
                            }
                            aria-label={t("increaseItemQuantity", {
                              sku: item.sku.skuCode,
                            })}
                            onClick={() => changeQuantity(item, 1)}
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(item.skuId)}
                        >
                          <Trash2 aria-hidden="true" />
                          {t("removeItem")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle as="h2">{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("subtotal")}</dt>
                  <dd className="font-medium">{subtotal}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("shipping")}</dt>
                  <dd className="text-right text-sm">
                    {t("shippingAtCheckout")}
                  </dd>
                </div>
              </dl>
              <Separator />
              <div className="flex items-center justify-between gap-4 text-base font-semibold">
                <span>{t("total")}</span>
                <span>{subtotal}</span>
              </div>
              <Button type="button" size="lg" className="w-full">
                {t("checkout")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
