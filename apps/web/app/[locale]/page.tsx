import { getTranslations } from "next-intl/server";
import { ProductsList } from "@/components/catalog/products-list";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CONNECTION_PAGE_SIZE } from "@/lib/graphql/pagination";
import { ProductsQuery } from "@/lib/graphql/queries";

export default async function Home() {
  const t = await getTranslations("catalog");
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <nav className="flex items-center gap-2" aria-label={t("navigation")}>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/cart"
          >
            {t("cart")}
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/account"
          >
            {t("account")}
          </Link>
        </nav>
      </header>

      <PreloadQuery
        query={ProductsQuery}
        variables={{ first: CONNECTION_PAGE_SIZE }}
      >
        <ProductsList />
      </PreloadQuery>
    </main>
  );
}
