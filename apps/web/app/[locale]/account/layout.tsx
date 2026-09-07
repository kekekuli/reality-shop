import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { GraphQLProvider } from "@/lib/graphql/apollo-provider";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider
      messages={{
        account: messages.account,
        auth: { error: messages.auth.error },
      }}
    >
      <GraphQLProvider>{children}</GraphQLProvider>
    </NextIntlClientProvider>
  );
}
