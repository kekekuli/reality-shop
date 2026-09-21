import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={{ order: messages.order }}>
      {children}
    </NextIntlClientProvider>
  );
}
