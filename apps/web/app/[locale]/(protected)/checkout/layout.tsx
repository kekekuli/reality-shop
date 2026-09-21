import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { GraphQLProvider } from "@/lib/graphql/apollo-provider";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider
      messages={{
        checkout: messages.checkout,
        address: messages.address,
        error: messages.error,
      }}
    >
      <GraphQLProvider>{children}</GraphQLProvider>
    </NextIntlClientProvider>
  );
}
