import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { OrdersList } from "@/components/order/orders-list";
import { OrdersView } from "@/components/order/orders-view";
import { getPathname } from "@/i18n/navigation";
import { GraphQLProvider } from "@/lib/graphql/apollo-provider";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CONNECTION_PAGE_SIZE } from "@/lib/graphql/pagination";
import { OrdersQuery } from "@/lib/graphql/queries";

export default async function OrdersPage() {
  const locale = await getLocale();
  const hasAccessToken = (await cookies()).has(AUTH_COOKIE.access);

  if (!hasAccessToken) {
    redirect(getPathname({ href: "/login", locale }));
  }

  const messages = await getMessages();

  return (
    <OrdersView>
      <NextIntlClientProvider messages={{ order: messages.order }}>
        <GraphQLProvider>
          <PreloadQuery
            query={OrdersQuery}
            variables={{ first: CONNECTION_PAGE_SIZE }}
          >
            <OrdersList />
          </PreloadQuery>
        </GraphQLProvider>
      </NextIntlClientProvider>
    </OrdersView>
  );
}
