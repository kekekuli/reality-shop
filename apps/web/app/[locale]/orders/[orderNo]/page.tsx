import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { OrderDetailView } from "@/components/order/order-detail-view";
import { getPathname } from "@/i18n/navigation";
import { getClient } from "@/lib/graphql/apollo-rsc";
import { OrderQuery } from "@/lib/graphql/queries";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const locale = await getLocale();
  const hasAccessToken = (await cookies()).has(AUTH_COOKIE.access);

  if (!hasAccessToken) {
    redirect(getPathname({ href: "/login", locale }));
  }

  const { data } = await getClient().query({
    query: OrderQuery,
    variables: { orderNo },
  });

  if (!data) {
    throw new Error("Order query did not return data");
  }

  return <OrderDetailView order={data.order} requestedOrderNo={orderNo} />;
}
