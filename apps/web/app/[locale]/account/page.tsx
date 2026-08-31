import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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

          <div className="flex items-center justify-between gap-4">
            <Link
              className="inline-flex text-sm font-medium underline-offset-4 hover:underline"
              href={getPathname({ href: "/", locale })}
            >
              {t("backToShop")}
            </Link>

            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
