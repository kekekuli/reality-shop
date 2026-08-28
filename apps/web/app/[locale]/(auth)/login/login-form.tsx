"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { useMutation } from "@apollo/client/react";
import { LoginMutation } from "@/lib/graphql/queries";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validation/auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { LoginFormValues } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const validationT = useTranslations("auth.validation");
  const errorT = useTranslations("auth.error");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [login] = useMutation(LoginMutation);

  const validationMessages: Record<string, string> = {
    invalidEmail: validationT("invalidEmail"),
    passwordRequired: validationT("passwordRequired"),
    passwordInputTooLong: validationT("passwordInputTooLong"),
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (input) => {
    setErrorMessage(null);

    try {
      const res = await login({
        variables: {
          input,
        },
      });

      const payload = res.data?.login;
      const errorCode = payload?.errors[0]?.code;

      if (errorCode === "INVALID_CREDENTIALS") {
        setErrorMessage(errorT("INVALID_CREDENTIALS"));
        return;
      }

      if (payload?.data) {
        router.replace("/");
        return;
      }

      setErrorMessage(errorT("unexpected"));
    } catch {
      setErrorMessage(errorT("network"));
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              disabled={isSubmitting}
              error={
                errors.email?.message
                  ? validationMessages[errors.email.message]
                  : undefined
              }
              label={t("email")}
              type="email"
              autoComplete="email"
              {...register("email")}
              required
            />

            <TextField
              disabled={isSubmitting}
              error={
                errors.password?.message
                  ? validationMessages[errors.password.message]
                  : undefined
              }
              label={t("password")}
              type="password"
              {...register("password")}
              autoComplete="current-password"
              required
            />

            <Button
              className="w-full"
              disabled={isSubmitting}
              size="lg"
              type="submit"
            >
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>

            {errorMessage && <FieldError>{errorMessage}</FieldError>}
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
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
