"use client";

import { MapPin, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
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
import { Separator } from "@/components/ui/separator";
import { Link, useRouter } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import type { CheckoutQuery as CheckoutQueryData } from "@/lib/graphql/generated/graphql";
import { CheckoutQuery, CreateOrderMutation } from "@/lib/graphql/queries";
import { cn } from "@/lib/utils";

type CheckoutItem = CheckoutQueryData["cart"]["items"][number];

function totalPrice(items: readonly CheckoutItem[]) {
  const cents = items.reduce(
    (total, item) => total + BigInt(item.sku.price) * BigInt(item.quantity),
    BigInt(0),
  );

  return formatPrice(cents.toString());
}

export function CheckoutView() {
  const t = useTranslations("checkout");
  const addressT = useTranslations("address");
  const errorT = useTranslations("error");
  const router = useRouter();
  const client = useApolloClient();
  const { cart, addresses } = useSuspenseQuery(CheckoutQuery).data;
  const items = cart.items;
  const [selectedAddressId, setSelectedAddressId] = useState(
    () =>
      addresses.find((address) => address.isDefault)?.id ??
      addresses[0]?.id ??
      "",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOrder, { loading: isCreatingOrder }] =
    useMutation(CreateOrderMutation);
  const subtotal = totalPrice(items);

  function reportOrderError(code?: string) {
    switch (code) {
      case "ADDRESS_NOT_FOUND":
      case "ORDER_ITEMS_EMPTY":
      case "DUPLICATE_ORDER_ITEM":
      case "INVALID_QUANTITY":
      case "SKU_NOT_FOUND":
      case "SKU_NOT_AVAILABLE":
      case "INSUFFICIENT_STOCK":
        setErrorMessage(errorT(code));
        break;
      default:
        setErrorMessage(errorT("unexpected"));
    }
  }

  function reportRequestError(error: unknown) {
    if (CombinedGraphQLErrors.is(error)) {
      const unauthenticated = error.errors.some(
        (graphQLError) => graphQLError.extensions?.code === "UNAUTHENTICATED",
      );
      setErrorMessage(
        errorT(unauthenticated ? "UNAUTHENTICATED" : "unexpected"),
      );
      return;
    }

    setErrorMessage(errorT("network"));
  }

  async function handleCreateOrder() {
    if (!selectedAddressId || isCreatingOrder || items.length === 0) return;

    setErrorMessage(null);

    try {
      const result = await createOrder({
        variables: {
          input: {
            addressId: selectedAddressId,
            items: items.map((item) => ({
              skuId: item.skuId,
              quantity: item.quantity,
            })),
          },
        },
      });
      const payload = result.data?.createOrder;
      const orderNo = payload?.data?.orderNo;

      if (!orderNo) {
        reportOrderError(payload?.errors[0]?.code);
        return;
      }

      client.cache.evict({ id: "ROOT_QUERY", fieldName: "orders" });
      const cartId = client.cache.identify({ __typename: "CartType" });
      if (cartId) {
        client.cache.modify({
          id: cartId,
          fields: {
            items: () => [],
          },
        });
      }
      client.cache.gc();
      router.push(`/orders/${orderNo}`);
    } catch (error) {
      reportRequestError(error);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="border-b pb-6">
        <Link
          className="text-sm font-medium underline-offset-4 hover:underline"
          href="/cart"
        >
          {t("backToCart")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
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
            <Link href="/cart" className={buttonVariants()}>
              {t("backToCart")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle as="h2">{t("items")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {items.map((item) => (
                    <li
                      key={item.skuId}
                      className="flex justify-between gap-6 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.sku.product.brand}
                        </p>
                        <Link
                          className="mt-1 inline-block font-medium underline-offset-4 hover:underline"
                          href={`/products/${item.sku.product.slug}`}
                        >
                          {item.sku.product.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.sku.skuCode} ·{" "}
                          {t("quantity", { quantity: item.quantity })}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium">
                        {formatPrice(
                          (
                            BigInt(item.sku.price) * BigInt(item.quantity)
                          ).toString(),
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle as="h2">{t("deliveryAddress")}</CardTitle>
                </div>
                <Link
                  className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
                  href="/account/addresses"
                >
                  {t("manageAddresses")}
                </Link>
              </CardHeader>
              <CardContent>
                {addresses.length === 0 ? (
                  <div className="space-y-3 rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      {t("noAddress")}
                    </p>
                    <Link
                      href="/account/addresses"
                      className="inline-flex text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {t("addAddress")}
                    </Link>
                  </div>
                ) : (
                  <fieldset disabled={isCreatingOrder}>
                    <legend className="sr-only">{t("deliveryAddress")}</legend>
                    <ul className="space-y-3">
                      {addresses.map((address) => {
                        const selected = selectedAddressId === address.id;

                        return (
                          <li key={address.id}>
                            <label
                              className={cn(
                                "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                                selected && "border-primary bg-primary/5",
                              )}
                            >
                              <input
                                className="mt-1"
                                type="radio"
                                name="delivery-address"
                                value={address.id}
                                checked={selected}
                                onChange={() =>
                                  setSelectedAddressId(address.id)
                                }
                              />
                              <MapPin
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">
                                    {address.receiverName}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {address.phone}
                                  </span>
                                  {address.isDefault && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                      {t("defaultAddress")}
                                    </span>
                                  )}
                                </span>
                                <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                                  {addressT("fullAddress", {
                                    region: addressT("region", {
                                      province: address.province,
                                      city: address.city,
                                      district: address.district,
                                    }),
                                    detail: address.detail,
                                  })}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                )}
              </CardContent>
            </Card>
          </div>

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
              <div className="flex items-center justify-between gap-4 font-semibold">
                <span>{t("total")}</span>
                <span>{subtotal}</span>
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={!selectedAddressId || isCreatingOrder}
                onClick={handleCreateOrder}
              >
                {t(isCreatingOrder ? "creatingOrder" : "placeOrder")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
