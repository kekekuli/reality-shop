import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { OrdersList } from "@/components/order/orders-list";
import { OrdersView } from "@/components/order/orders-view";
import { GraphQLProvider } from "@/lib/graphql/apollo-provider";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CONNECTION_PAGE_SIZE } from "@/lib/graphql/pagination";
import { OrdersQuery } from "@/lib/graphql/queries";

export default async function OrdersPage() {
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
