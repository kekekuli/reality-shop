import { getTranslations } from "next-intl/server";
import { gqlFetch } from "@/lib/graphql/client";
import { ProductsQuery } from "@/lib/graphql/queries";
import { lowestPrice } from "@/lib/format";

export default async function Home() {
  const t = await getTranslations("catalog");
  const data = await gqlFetch(ProductsQuery);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.products.edges.map(({ node }) => {
          const price = lowestPrice(node.skus.map((s) => s.price));

          return (
            <li
              key={node.id}
              className="rounded-lg border border-black/10 p-4 transition-shadow hover:shadow-md dark:border-white/15"
            >
              <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                {node.brand}
              </p>
              <h2 className="mt-1 font-medium">{node.title}</h2>
              <p className="mt-3 text-lg font-semibold text-red-600 dark:text-red-400">
                {price ? t("priceFrom", { price }) : t("noPrice")}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
