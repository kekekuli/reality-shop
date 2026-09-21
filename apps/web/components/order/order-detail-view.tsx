import Link from "next/link";
import { Clock3, MapPin, PackageOpen, ReceiptText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPathname } from "@/i18n/navigation";
import { formatDateTime, formatPrice } from "@/lib/format";
import { OrderStatus } from "./order-status";
import type { OrderDetailViewModel } from "./order-view-model";

export async function OrderDetailView({
  order,
  requestedOrderNo,
}: {
  order: OrderDetailViewModel | null;
  requestedOrderNo: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("order");

  if (!order) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
        <Link
          href={getPathname({ href: "/orders", locale })}
          className={buttonVariants({ variant: "ghost" })}
        >
          ← {t("detail.backToOrders")}
        </Link>

        <Card className="mt-8 items-center py-12 text-center">
          <CardContent className="flex max-w-md flex-col items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <PackageOpen aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle as="h1" className="text-lg">
                {t("detail.notFoundTitle")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("detail.notFoundDescription", {
                  orderNo: requestedOrderNo,
                })}
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const address = order.shippingAddress;
  const statusLabels: Record<string, string> = {
    pending_payment: t("status.pendingPayment"),
    paid: t("status.paid"),
    cancelled: t("status.cancelled"),
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <nav>
        <Link
          href={getPathname({ href: "/orders", locale })}
          className={buttonVariants({ variant: "ghost" })}
        >
          ← {t("detail.backToOrders")}
        </Link>
      </nav>

      <header className="mt-6 flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(locale, order.createdAt)}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {t("orderNumber", { orderNo: order.orderNo })}
          </h1>
        </div>
        <OrderStatus
          status={order.status}
          label={statusLabels[order.status] ?? t("status.unknown")}
        />
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle as="h2">{t("detail.items")}</CardTitle>
              <CardDescription>
                {t("detail.itemCount", { count: order.items.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li
                    key={item.skuId}
                    className="grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <h3 className="font-medium">{item.productTitle}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("skuCode", { code: item.skuCode })}
                      </p>
                      {item.specs.length > 0 && (
                        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          {item.specs.map((spec) => (
                            <div key={spec.key} className="flex gap-1">
                              <dt className="text-muted-foreground">
                                {spec.key}:
                              </dt>
                              <dd>{spec.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p className="mt-3 text-sm text-muted-foreground">
                        {t("detail.unitPriceQuantity", {
                          price: formatPrice(item.unitPrice),
                          quantity: item.quantity,
                        })}
                      </p>
                    </div>
                    <p className="font-semibold sm:text-right">
                      {formatPrice(item.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <MapPin
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <CardTitle as="h2">{t("detail.shippingAddress")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <address className="not-italic">
                <p className="font-medium">
                  {address.receiverName}
                  <span className="ml-3 font-normal text-muted-foreground">
                    {address.phone}
                  </span>
                </p>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {t("detail.fullAddress", {
                    province: address.province,
                    city: address.city,
                    district: address.district,
                    detail: address.detail,
                  })}
                </p>
              </address>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-8">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <ReceiptText
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <CardTitle as="h2">{t("summary")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("subtotal")}</dt>
                  <dd className="font-medium">{formatPrice(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("shipping")}</dt>
                  <dd className="font-medium">{formatPrice(order.shipping)}</dd>
                </div>
              </dl>
              <Separator />
              <div className="flex items-center justify-between gap-4 text-base font-semibold">
                <span>{t("total")}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {order.status === "pending_payment" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock3
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                  <CardTitle as="h2">{t("detail.paymentPending")}</CardTitle>
                </div>
                <CardDescription>
                  {t("detail.paymentExpires", {
                    date: formatDateTime(locale, order.paymentExpiresAt),
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" size="lg" className="w-full">
                  {t("detail.payNow")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
