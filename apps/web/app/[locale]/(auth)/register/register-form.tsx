"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { useMutation } from "@apollo/client/react";
import { RegisterMutation } from "@/lib/graphql/queries";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validation/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const validationT = useTranslations("auth.validation");
  const errorT = useTranslations("auth.error");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createAccount] = useMutation(RegisterMutation);

  const validationMessages: Record<string, string> = {
    invalidEmail: validationT("invalidEmail"),
    passwordTooShort: validationT("passwordTooShort"),
    passwordTooLong: validationT("passwordTooLong"),
    displayNameRequired: validationT("displayNameRequired"),
    displayNameTooLong: validationT("displayNameTooLong"),
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = async (input) => {
    setErrorMessage(null);

    try {
      const res = await createAccount({ variables: { input } });
      const payload = res.data?.register;
      const errorCode = payload?.errors[0]?.code;

      if (errorCode === "EMAIL_ALREADY_TAKEN") {
        setErrorMessage(errorT("EMAIL_ALREADY_TAKEN"));
        return;
      }

      if (payload?.data) {
        router.replace("/account");
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
                errors.displayName?.message
                  ? validationMessages[errors.displayName.message]
                  : undefined
              }
              label={t("displayName")}
              type="text"
              autoComplete="name"
              {...register("displayName")}
              required
            />

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
              autoComplete="new-password"
              {...register("password")}
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
        {t("hasAccount")}{" "}
        <Link
          className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          {t("login")}
        </Link>
      </CardFooter>
    </Card>
  );
}
