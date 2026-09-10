import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AddCartItemButton } from "@/components/cart/add-cart-item-button";
import { buttonVariants } from "@/components/ui/button";
import { getPathname } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { gqlFetch } from "@/lib/graphql/client";
import { ProductQuery } from "@/lib/graphql/queries";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [catalogT, cartT, data] = await Promise.all([
    getTranslations("catalog"),
    getTranslations("cart"),
    gqlFetch(ProductQuery, { slug }),
  ]);
  const product = data.product;

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={getPathname({ href: "/", locale })}
        className={buttonVariants({ variant: "ghost" })}
      >
        ← {catalogT("backToProducts")}
      </Link>

      <header className="mt-6 border-b pb-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          {product.brand}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {product.title}
        </h1>
      </header>

      <section className="mt-8" aria-labelledby="available-options-title">
        <h2 id="available-options-title" className="text-xl font-semibold">
          {catalogT("availableOptions")}
        </h2>

        {product.skus.length === 0 ? (
          <p className="mt-4 text-muted-foreground">{catalogT("noSkus")}</p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border">
            {product.skus.map((sku) => (
              <li
                key={sku.skuId}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{formatPrice(sku.price)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {catalogT("skuCode", { code: sku.skuCode })}
                  </p>
                </div>

                <AddCartItemButton
                  skuId={sku.skuId}
                  label={cartT("addItem")}
                  pendingLabel={cartT("addingItem")}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
