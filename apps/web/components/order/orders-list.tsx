"use client";

import { PackageOpen, ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatPrice } from "@/lib/format";
import { CONNECTION_PAGE_SIZE } from "@/lib/graphql/pagination";
import { OrdersQuery } from "@/lib/graphql/queries";
import { OrderStatus } from "./order-status";

export function OrdersList() {
  const locale = useLocale();
  const t = useTranslations("order");
  const { data, fetchMore } = useSuspenseQuery(OrdersQuery, {
    variables: { first: CONNECTION_PAGE_SIZE },
  });
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const orders = data.orders.edges.map(({ node }) => node);
  const { endCursor, hasNextPage } = data.orders.pageInfo;
  const canLoadMore = hasNextPage && endCursor !== null;
  const statusLabels: Record<string, string> = {
    pending_payment: t("status.pendingPayment"),
    paid: t("status.paid"),
    cancelled: t("status.cancelled"),
  };

  function loadMore() {
    if (!canLoadMore || isLoadingMore) return;

    setLoadMoreFailed(false);
    startLoadingMore(async () => {
      try {
        await fetchMore({
          variables: {
            first: CONNECTION_PAGE_SIZE,
            after: endCursor,
          },
        });
      } catch {
        setLoadMoreFailed(true);
      }
    });
  }

  if (orders.length === 0) {
    return (
      <Card className="mt-8 items-center py-12 text-center">
        <CardContent className="flex max-w-md flex-col items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <PackageOpen aria-hidden="true" className="size-5" />
          </span>
          <div>
            <CardTitle as="h2" className="text-lg">
              {t("list.emptyTitle")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("list.emptyDescription")}
            </CardDescription>
          </div>
          <Link
            href="/"
            className={buttonVariants()}
          >
            {t("browseProducts")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ul className="mt-8 space-y-4" aria-label={t("list.title")}>
        {orders.map((order) => {
          const visibleItems = order.items.slice(0, 2);
          const remainingItems = order.items.length - visibleItems.length;

          return (
            <li key={order.orderNo}>
              <Link
                href={`/orders/${order.orderNo}`}
                className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="transition-colors hover:bg-muted/30">
                  <CardHeader className="border-b">
                    <div className="flex min-w-0 items-center gap-2">
                      <ReceiptText
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <CardTitle as="h2" className="truncate">
                        {t("orderNumber", { orderNo: order.orderNo })}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {formatDateTime(locale, order.createdAt)}
                    </CardDescription>
                    <CardAction>
                      <OrderStatus
                        status={order.status}
                        label={
                          statusLabels[order.status] ?? t("status.unknown")
                        }
                      />
                    </CardAction>
                  </CardHeader>

                  <CardContent className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0 space-y-2">
                      {visibleItems.map((item) => (
                        <div
                          key={item.skuId}
                          className="flex min-w-0 items-baseline justify-between gap-4"
                        >
                          <p className="truncate font-medium">
                            {item.productTitle}
                          </p>
                          <p className="shrink-0 text-sm text-muted-foreground">
                            {t("quantity", { quantity: item.quantity })}
                          </p>
                        </div>
                      ))}
                      {remainingItems > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t("list.moreItems", { count: remainingItems })}
                        </p>
                      )}
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("total")}
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {canLoadMore && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingMore}
            onClick={loadMore}
          >
            {isLoadingMore ? t("list.loadingMore") : t("list.nextPage")}
          </Button>
        </div>
      )}

      {loadMoreFailed && (
        <p className="mt-3 text-center text-sm text-destructive" role="alert">
          {t("list.loadMoreError")}
        </p>
      )}
    </>
  );
}
