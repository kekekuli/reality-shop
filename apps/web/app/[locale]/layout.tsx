import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import "../globals.css";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { getPathname } from "@/i18n/navigation";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(env.SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: getPathname({ href: "/", locale }),
      languages: {
        en: getPathname({ href: "/", locale: "en" }),
        zh: getPathname({ href: "/", locale: "zh" }),
        "x-default": getPathname({ href: "/", locale: routing.defaultLocale }),
      },
    },
  };
}
