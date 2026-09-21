import { OrdersList } from "@/components/order/orders-list";
import { OrdersView } from "@/components/order/orders-view";
import { GraphQLProvider } from "@/lib/graphql/apollo-provider";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CONNECTION_PAGE_SIZE } from "@/lib/graphql/pagination";
import { OrdersQuery } from "@/lib/graphql/queries";

export default async function OrdersPage() {
  return (
    <OrdersView>
      <GraphQLProvider>
        <PreloadQuery
          query={OrdersQuery}
          variables={{ first: CONNECTION_PAGE_SIZE }}
        >
          <OrdersList />
        </PreloadQuery>
      </GraphQLProvider>
    </OrdersView>
  );
}
