import { OrderDetailView } from "@/components/order/order-detail-view";
import { query } from "@/lib/graphql/apollo-rsc";
import { requireGraphQLData } from "@/lib/graphql/errors";
import { OrderQuery } from "@/lib/graphql/queries";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  const { data } = await query({
    query: OrderQuery,
    variables: { orderNo },
  });

  const order = requireGraphQLData(data).order;

  return <OrderDetailView order={order} requestedOrderNo={orderNo} />;
}
