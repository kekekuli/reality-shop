import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { query } from "@/lib/graphql/apollo-rsc";
import {
  hasGraphQLErrorCode,
  requireGraphQLData,
} from "@/lib/graphql/errors";
import { MeQuery } from "@/lib/graphql/queries";
import { LogoutButton } from "./logout-button";

export default async function AccountPage() {
  const locale = await getLocale();
  const t = await getTranslations("account");
  const result = await query({ query: MeQuery }).catch((error: unknown) => {
    if (hasGraphQLErrorCode(error, "UNAUTHENTICATED")) {
      redirect(getPathname({ href: "/login", locale }));
    }

    throw error;
  });
  const { me } = requireGraphQLData(result.data);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl grid-rows-[auto_1fr] px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <nav aria-label={t("navigation")} className="flex items-center gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/"
          >
            {t("backToShop")}
          </Link>

          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/account/addresses"
          >
            {t("manageAddresses")}
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/orders"
          >
            {t("orders")}
          </Link>
        </nav>
      </header>

      <section className="flex items-center justify-center py-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("displayName")}
                </dt>
                <dd className="mt-1 font-medium">{me.displayName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{t("email")}</dt>
                <dd className="mt-1 font-medium">{me.email}</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="justify-end">
            <LogoutButton />
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
