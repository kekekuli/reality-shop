import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AddressesQuery as AddressesQueryResult } from "@/lib/graphql/generated/graphql";

type SavedAddressesProps = {
  addresses: AddressesQueryResult["addresses"];
  editingAddressId?: string;
};

export function SavedAddresses({
  addresses,
  editingAddressId,
}: SavedAddressesProps) {
  const t = useTranslations("address");

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" id="saved-addresses-title">
          {t("savedTitle")}
        </CardTitle>
        <CardDescription>{t("savedDescription")}</CardDescription>
      </CardHeader>

      {addresses.length === 0 ? (
        <CardContent>
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <span className="mb-4 rounded-full bg-muted p-3">
              <MapPin
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>
        </CardContent>
      ) : (
        <CardContent className="p-0">
          <ul className="divide-y">
            {addresses.map((address) => (
              <li
                key={address.id}
                className={cn(
                  "border-l-2 border-l-transparent",
                  editingAddressId === address.id &&
                    "border-l-primary bg-primary/10",
                )}
                data-editing={editingAddressId === address.id || undefined}
              >
                <Link
                  aria-label={t("editAddress", {
                    receiver: address.receiverName,
                  })}
                  aria-current={
                    editingAddressId === address.id ? "page" : undefined
                  }
                  className="flex gap-3 px-6 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  href={`/account/addresses?edit=${encodeURIComponent(address.id)}`}
                >
                  <span className="mt-0.5 h-fit shrink-0 rounded-full bg-muted p-2">
                    <MapPin
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{address.receiverName}</p>
                      <p className="text-sm text-muted-foreground">
                        {address.phone}
                      </p>
                      {address.isDefault && (
                        <span className="ml-auto rounded-full bg-muted px-2 py-1 text-xs font-medium">
                          {t("defaultBadge")}
                        </span>
                      )}
                    </div>

                    <address className="mt-2 text-sm leading-6 not-italic text-muted-foreground">
                      {t("fullAddress", {
                        region: t("region", {
                          province: address.province,
                          city: address.city,
                          district: address.district,
                        }),
                        detail: address.detail,
                      })}
                    </address>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
