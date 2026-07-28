import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: lang } = await params;
  if (!hasLocale(routing.locales, lang)) {
    return notFound();
  }

  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
