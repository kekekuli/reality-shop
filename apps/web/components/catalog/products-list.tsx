"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { lowestPrice } from "@/lib/format";
import { CONNECTION_PAGE_SIZE } from "@/lib/graphql/pagination";
import { ProductsQuery } from "@/lib/graphql/queries";

export function ProductsList() {
  const t = useTranslations("catalog");
  const { data, fetchMore } = useSuspenseQuery(ProductsQuery, {
    variables: { first: CONNECTION_PAGE_SIZE },
  });
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const { endCursor, hasNextPage } = data.products.pageInfo;
  const canLoadMore = hasNextPage && endCursor !== null;

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

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.products.edges.map(({ node }) => {
          const price = lowestPrice(node.skus.map((sku) => sku.price));

          return (
            <li
              key={node.id}
              className="rounded-lg border border-black/10 transition-shadow hover:shadow-md dark:border-white/15"
            >
              <Link
                href={`/products/${node.slug}`}
                className="block rounded-lg p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  {node.brand}
                </p>
                <h2 className="mt-1 font-medium">{node.title}</h2>
                <p className="mt-3 text-lg font-semibold text-red-600 dark:text-red-400">
                  {price ? t("priceFrom", { price }) : t("noPrice")}
                </p>
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
            {isLoadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      )}

      {loadMoreFailed && (
        <p className="mt-3 text-center text-sm text-destructive" role="alert">
          {t("loadMoreError")}
        </p>
      )}
    </>
  );
}
