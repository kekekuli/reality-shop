import { OrderDetailView } from "@/components/order/order-detail-view";
import { getClient } from "@/lib/graphql/apollo-rsc";
import { OrderQuery } from "@/lib/graphql/queries";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  const { data } = await getClient().query({
    query: OrderQuery,
    variables: { orderNo },
  });

  if (!data) {
    throw new Error("Order query did not return data");
  }

  return <OrderDetailView order={data.order} requestedOrderNo={orderNo} />;
}
