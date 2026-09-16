import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { AddressForm } from "./address-form";
import { SavedAddresses } from "./saved-addresses";
import { getPathname, Link } from "@/i18n/navigation";
import { gqlFetch } from "@/lib/graphql/client";
import { AddressesQuery } from "@/lib/graphql/queries";
import { addressDraftKey } from "@/lib/address-draft";

export default async function AddressesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const { locale } = await params;
  const { edit } = await searchParams;
  const t = await getTranslations("address");
  const hasAccessToken = (await cookies()).has(AUTH_COOKIE.access);

  if (!hasAccessToken) {
    redirect(getPathname({ href: "/login", locale }));
  }

  const { addresses, me } = await gqlFetch(AddressesQuery);
  const editingAddress =
    typeof edit === "string"
      ? addresses.find((address) => address.id === edit)
      : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <header className="mb-8 space-y-3">
        <Link
          className="inline-flex text-sm font-medium underline-offset-4 hover:underline"
          href="/account"
        >
          {t("backToAccount")}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)] lg:items-start">
        <section aria-labelledby="saved-addresses-title">
          <SavedAddresses
            addresses={addresses}
            editingAddressId={editingAddress?.id}
          />
        </section>

        <section
          aria-label={t(editingAddress ? "editFormTitle" : "formTitle")}
        >
          <AddressForm
            key={editingAddress?.id ?? "create"}
            draftKey={addressDraftKey(me.id, editingAddress?.id)}
            initialAddress={editingAddress}
          />
        </section>
      </div>
    </main>
  );
}
