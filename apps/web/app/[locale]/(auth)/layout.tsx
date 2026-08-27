import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { GraphQLProvider } from "@/lib/graphql/apollo-provider";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={{ auth: messages.auth }}>
      <GraphQLProvider>{children}</GraphQLProvider>
    </NextIntlClientProvider>
  );
}
