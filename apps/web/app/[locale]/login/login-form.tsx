"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

export function LoginForm() {
  const t = useTranslations("auth.login");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: Execute LoginMutation and handle its result.
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <TextField
              label={t("email")}
              name="email"
              type="email"
              autoComplete="email"
              required
            />

            <TextField
              label={t("password")}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <Button className="w-full" size="lg" type="submit">
              {t("submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("noAccount")} {" "}
        <Link
          className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          href="/register"
        >
          {t("register")}
        </Link>
      </CardFooter>
    </Card>
  );
}
