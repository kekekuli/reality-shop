import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { gqlFetch, GraphQLRequestError } from "@/lib/graphql/client";
import { MeQuery } from "@/lib/graphql/queries";
import { LogoutButton } from "./logout-button";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("account");
  let data;

  try {
    data = await gqlFetch(MeQuery);
  } catch (error) {
    if (
      error instanceof GraphQLRequestError &&
      error.hasCode("UNAUTHENTICATED")
    ) {
      redirect(getPathname({ href: "/login", locale }));
    }

    throw error;
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl grid-rows-[auto_1fr] px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <nav
          aria-label={t("navigation")}
          className="flex items-center gap-2"
        >
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={getPathname({ href: "/", locale })}
          >
            {t("backToShop")}
          </Link>

          <Link
            className={buttonVariants({ variant: "outline" })}
            href={getPathname({ href: "/account/addresses", locale })}
          >
            {t("manageAddresses")}
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
                <dd className="mt-1 font-medium">{data.me.displayName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{t("email")}</dt>
                <dd className="mt-1 font-medium">{data.me.email}</dd>
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
