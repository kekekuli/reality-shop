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
  const [catalogT, data] = await Promise.all([
    getTranslations("catalog"),
    gqlFetch(ProductQuery, { slug }),
  ]);
  const product = data.product;

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="flex items-center justify-between gap-4">
        <Link
          href={getPathname({ href: "/", locale })}
          className={buttonVariants({ variant: "ghost" })}
        >
          ← {catalogT("backToProducts")}
        </Link>
        <Link
          href={getPathname({ href: "/cart", locale })}
          className={buttonVariants({ variant: "outline" })}
        >
          {catalogT("cart")}
        </Link>
      </nav>

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
                className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-medium">{formatPrice(sku.price)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {catalogT("skuCode", { code: sku.skuCode })}
                  </p>
                </div>

                <AddCartItemButton sku={sku} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
