import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getPathname } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";

export type CartViewItem = {
  skuId: string;
  skuCode: string;
  productSlug: string;
  productTitle: string;
  brand: string;
  price: string;
  quantity: number;
};

type CartViewProps = {
  locale: string;
  items: CartViewItem[];
};

function totalPrice(items: CartViewItem[]) {
  const cents = items.reduce(
    (total, item) => total + BigInt(item.price) * BigInt(item.quantity),
    BigInt(0),
  );

  return formatPrice(cents.toString());
}

export async function CartView({ locale, items }: CartViewProps) {
  const t = await getTranslations("cart");
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

        <Link
          href={getPathname({ href: "/", locale })}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("continueShopping")}
        </Link>
      </header>

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
                (BigInt(item.price) * BigInt(item.quantity)).toString(),
              );

              return (
                <li key={item.skuId}>
                  <Card>
                    <CardContent className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.brand}
                        </p>
                        <Link
                          href={getPathname({
                            href: `/products/${item.productSlug}`,
                            locale,
                          })}
                          className="mt-1 inline-block text-base font-medium underline-offset-4 hover:underline"
                        >
                          {item.productTitle}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("skuCode", { code: item.skuCode })}
                        </p>
                        <p className="mt-3 text-sm">
                          {t("unitPrice", { price: formatPrice(item.price) })}
                        </p>
                      </div>

                      <p className="font-semibold sm:text-right">{lineTotal}</p>

                      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={t("decreaseItemQuantity", {
                              sku: item.skuCode,
                            })}
                          >
                            <Minus aria-hidden="true" />
                          </Button>
                          <Input
                            className="h-7 w-16 text-center"
                            type="number"
                            min="1"
                            max="99"
                            step="1"
                            inputMode="numeric"
                            defaultValue={item.quantity}
                            aria-label={t("itemQuantity", {
                              sku: item.skuCode,
                            })}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={t("increaseItemQuantity", {
                              sku: item.skuCode,
                            })}
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
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
