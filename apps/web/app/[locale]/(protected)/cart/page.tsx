import { CartView } from "@/components/cart/cart-view";
import { PreloadQuery } from "@/lib/graphql/apollo-rsc";
import { CartQuery } from "@/lib/graphql/queries";

export default function CartPage() {
  return (
    <PreloadQuery query={CartQuery}>
      <CartView />
    </PreloadQuery>
  );
}
