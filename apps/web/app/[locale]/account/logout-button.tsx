"use client";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { LogoutMutation } from "@/lib/graphql/queries";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("account");
  const errorT = useTranslations("auth.error");
  const [logout, { loading }] = useMutation(LogoutMutation);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const client = useApolloClient();
  const router = useRouter();

  async function handleLogout() {
    if (loading) return;

    setErrorMessage(null);

    let res;

    try {
      res = await logout();
    } catch {
      setErrorMessage(errorT("network"));
      return;
    }

    if (!res.data?.logout.data?.loggedOut) {
      setErrorMessage(errorT("unexpected"));
      return;
    }

    try {
      await client.clearStore();
    } catch (error) {
      console.error("Failed to clear Apollo cache after logout", error);
    }

    router.replace("/login");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={handleLogout}
      >
        {loading ? t("loggingOut") : t("logout")}
      </Button>
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </div>
  );
}
