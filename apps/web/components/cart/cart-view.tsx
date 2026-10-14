"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@apollo/client/react";
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
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { PURCHASE_QUANTITY } from "@reality-shop/shared-types";
import type { CartQuery as CartQueryData } from "@/lib/graphql/generated/graphql";
import { CartQuery } from "@/lib/graphql/queries";
import useCartItemsUpdate from "./useCartItemsUpdate";

type CartItem = CartQueryData["cart"]["items"][number];

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

export function CartView() {
  const t = useTranslations("cart");
  const errorT = useTranslations("error");
  const items = useCartItems();

  const { errorKey, update, remove } = useCartItemsUpdate();
  const errorMessage = errorKey ? errorT(errorKey) : null;
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = totalPrice(items);

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

        <Link href="/" className={buttonVariants({ variant: "outline" })}>
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
            <Link href="/" className={buttonVariants()}>
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
                          href={`/products/${item.sku.product.slug}`}
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
                            disabled={item.quantity <= PURCHASE_QUANTITY.min}
                            aria-label={t("decreaseItemQuantity", {
                              sku: item.sku.skuCode,
                            })}
                            onClick={() =>
                              update(item.skuId, {
                                quantity: (current) => current - 1,
                              })
                            }
                          >
                            <Minus aria-hidden="true" />
                          </Button>
                          <Input
                            className="h-7 w-16 text-center"
                            type="number"
                            min={PURCHASE_QUANTITY.min}
                            max={PURCHASE_QUANTITY.max}
                            step="1"
                            inputMode="numeric"
                            value={item.quantity}
                            aria-label={t("itemQuantity", {
                              sku: item.sku.skuCode,
                            })}
                            onChange={(event) =>
                              update(item.skuId, {
                                quantity: Number(event.target.value),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={item.quantity >= PURCHASE_QUANTITY.max}
                            aria-label={t("increaseItemQuantity", {
                              sku: item.sku.skuCode,
                            })}
                            onClick={() =>
                              update(item.skuId, {
                                quantity: (current) => current + 1,
                              })
                            }
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => remove(item.skuId)}
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
              <Link
                href="/checkout"
                className={buttonVariants({
                  size: "lg",
                  className: "w-full",
                })}
              >
                {t("checkout")}
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
