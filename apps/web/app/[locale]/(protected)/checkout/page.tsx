import { CheckoutView } from "@/components/checkout/checkout-view";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CheckoutQuery } from "@/lib/graphql/queries";

export default function CheckoutPage() {
  return (
    <PreloadQuery query={CheckoutQuery}>
      <CheckoutView />
    </PreloadQuery>
  );
}
