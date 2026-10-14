import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PURCHASE_QUANTITY } from "@reality-shop/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import type { CheckoutQuery } from "@/lib/graphql/generated/graphql";
import { cn } from "@/lib/utils";

export type CheckoutItem = CheckoutQuery["cart"]["items"][number];

type CheckoutItemsProps = {
  items: readonly CheckoutItem[];
  disabled?: boolean;
  isSelectionPending?: (skuId: string) => boolean;
  onQuantityChangeAction: (item: CheckoutItem, quantity: number) => void;
  onSelectionChangeAction: (item: CheckoutItem, isSelected: boolean) => void;
};

export function CheckoutItems({
  items,
  disabled = false,
  isSelectionPending = () => false,
  onQuantityChangeAction,
  onSelectionChangeAction,
}: CheckoutItemsProps) {
  const t = useTranslations("checkout");

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t("items")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((item) => {
            const controlsDisabled = disabled;

            return (
              <li
                key={item.skuId}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]",
                  !item.isSelected && "text-muted-foreground",
                )}
              >
                <input
                  className="mt-1 size-4"
                  type="checkbox"
                  checked={item.isSelected}
                  disabled={controlsDisabled || isSelectionPending(item.skuId)}
                  aria-label={t("selectItem", { sku: item.sku.skuCode })}
                  onChange={(event) =>
                    onSelectionChangeAction(item, event.target.checked)
                  }
                />

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
                    {item.sku.skuCode}
                  </p>
                </div>

                <div className="col-start-2 flex flex-wrap items-center justify-between gap-3 sm:col-start-3 sm:row-span-2 sm:flex-col sm:items-end">
                  <p className="shrink-0 font-medium">
                    {formatPrice(
                      (
                        BigInt(item.sku.price) * BigInt(item.quantity)
                      ).toString(),
                    )}
                  </p>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={
                        controlsDisabled ||
                        item.quantity <= PURCHASE_QUANTITY.min
                      }
                      aria-label={t("decreaseItemQuantity", {
                        sku: item.sku.skuCode,
                      })}
                      onClick={() =>
                        onQuantityChangeAction(item, item.quantity - 1)
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
                      disabled={controlsDisabled}
                      aria-label={t("itemQuantity", {
                        sku: item.sku.skuCode,
                      })}
                      onChange={(event) =>
                        onQuantityChangeAction(item, Number(event.target.value))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={
                        controlsDisabled ||
                        item.quantity >= PURCHASE_QUANTITY.max
                      }
                      aria-label={t("increaseItemQuantity", {
                        sku: item.sku.skuCode,
                      })}
                      onClick={() =>
                        onQuantityChangeAction(item, item.quantity + 1)
                      }
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
