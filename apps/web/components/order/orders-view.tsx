import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function OrdersView({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("order");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <header className="flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {t("list.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("list.description")}
          </p>
        </div>

        <nav className="flex items-center gap-2" aria-label={t("navigation")}>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("products")}
          </Link>
          <Link
            href="/account"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("account")}
          </Link>
        </nav>
      </header>

      {children}
    </main>
  );
}
