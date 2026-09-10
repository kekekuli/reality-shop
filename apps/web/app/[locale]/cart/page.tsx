import { CartView, type CartViewItem } from "@/components/cart/cart-view";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const items: CartViewItem[] = [];

  return <CartView locale={locale} items={items} />;
}
