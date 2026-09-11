import { CartView } from "@/components/cart/cart-view";
import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CartQuery } from "@/lib/graphql/queries";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const hasAccessToken = (await cookies()).has(AUTH_COOKIE.access);

  if (!hasAccessToken) {
    redirect(getPathname({ href: "/login", locale }));
  }

  return (
    <PreloadQuery query={CartQuery}>
      <CartView locale={locale} />
    </PreloadQuery>
  );
}
