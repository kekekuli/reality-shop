"use client";

import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { TextField } from "@/components/ui/text-field";
import { useRouter } from "@/i18n/navigation";
import { CreateAddressMutation } from "@/lib/graphql/queries";
import {
  createAddressSchema,
  type AddressFormValues,
} from "@/lib/validation/address";

export function AddressForm() {
  const router = useRouter();
  const t = useTranslations("address");
  const errorT = useTranslations("error");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createAddress] = useMutation(CreateAddressMutation);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      receiverName: "",
      phone: "",
      province: "",
      city: "",
      district: "",
      detail: "",
      isDefault: false,
    },
  });

  const requiredMessage = t("validation.required");

  const onSubmit: SubmitHandler<AddressFormValues> = async (input) => {
    setErrorMessage(null);

    try {
      const result = await createAddress({ variables: { input } });
      const payload = result.data?.createAddress;

      if (!payload?.data || payload.errors.length > 0) {
        setErrorMessage(errorT("unexpected"));
        return;
      }

      reset();
      router.refresh();
    } catch (error) {
      if (CombinedGraphQLErrors.is(error)) {
        const isUnauthenticated = error.errors.some(
          (graphQLError) => graphQLError.extensions?.code === "UNAUTHENTICATED",
        );

        setErrorMessage(
          errorT(isUnauthenticated ? "UNAUTHENTICATED" : "unexpected"),
        );
        return;
      }

      setErrorMessage(errorT("network"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t("formTitle")}</CardTitle>
        <CardDescription>{t("formDescription")}</CardDescription>
      </CardHeader>

      <form
        noValidate
        aria-busy={isSubmitting}
        onSubmit={handleSubmit(onSubmit)}
      >
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                disabled={isSubmitting}
                error={errors.receiverName ? requiredMessage : undefined}
                label={t("receiverName")}
                autoComplete="name"
                {...register("receiverName")}
                required
              />
              <TextField
                disabled={isSubmitting}
                error={errors.phone ? requiredMessage : undefined}
                label={t("phone")}
                type="tel"
                autoComplete="tel"
                {...register("phone")}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <TextField
                disabled={isSubmitting}
                error={errors.province ? requiredMessage : undefined}
                label={t("province")}
                autoComplete="address-level1"
                {...register("province")}
                required
              />
              <TextField
                disabled={isSubmitting}
                error={errors.city ? requiredMessage : undefined}
                label={t("city")}
                autoComplete="address-level2"
                {...register("city")}
                required
              />
              <TextField
                disabled={isSubmitting}
                error={errors.district ? requiredMessage : undefined}
                label={t("district")}
                autoComplete="address-level3"
                {...register("district")}
                required
              />
            </div>

            <TextField
              disabled={isSubmitting}
              error={errors.detail ? requiredMessage : undefined}
              label={t("detail")}
              autoComplete="street-address"
              {...register("detail")}
              required
            />

            <Field
              data-disabled={isSubmitting || undefined}
              orientation="horizontal"
            >
              <input
                id="isDefault"
                type="checkbox"
                disabled={isSubmitting}
                className="size-4 rounded border-input accent-primary"
                {...register("isDefault")}
              />
              <FieldLabel htmlFor="isDefault">{t("defaultAddress")}</FieldLabel>
            </Field>

            {errorMessage && <FieldError>{errorMessage}</FieldError>}
          </FieldGroup>
        </CardContent>

        <CardFooter className="mt-5 justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => {
              reset();
              setErrorMessage(null);
            }}
          >
            {t("reset")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving") : t("save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
