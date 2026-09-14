import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
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
};

export function SavedAddresses({ addresses }: SavedAddressesProps) {
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
              <li key={address.id} className="flex gap-3 px-6 py-4">
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
                      <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium">
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
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
