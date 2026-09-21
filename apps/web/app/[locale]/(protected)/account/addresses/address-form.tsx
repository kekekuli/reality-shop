"use client";

import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import type { AddressesQuery as AddressesQueryResult } from "@/lib/graphql/generated/graphql";
import {
  CreateAddressMutation,
  UpdateAddressMutation,
} from "@/lib/graphql/queries";
import {
  clearAddressDraft,
  readAddressDraft,
  writeAddressDraft,
} from "@/lib/address-draft";
import {
  createAddressSchema,
  type AddressFormValues,
} from "@/lib/validation/address";

type AddressFormProps = {
  draftKey: string;
  initialAddress?: AddressesQueryResult["addresses"][number];
};

export function AddressForm({ draftKey, initialAddress }: AddressFormProps) {
  const router = useRouter();
  const t = useTranslations("address");
  const errorT = useTranslations("error");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createAddress] = useMutation(CreateAddressMutation);
  const [updateAddress] = useMutation(UpdateAddressMutation);
  const isEditing = initialAddress !== undefined;

  const {
    register,
    handleSubmit,
    reset,
    subscribe,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: initialAddress
      ? {
          receiverName: initialAddress.receiverName,
          phone: initialAddress.phone,
          province: initialAddress.province,
          city: initialAddress.city,
          district: initialAddress.district,
          detail: initialAddress.detail,
          isDefault: initialAddress.isDefault,
        }
      : {
          receiverName: "",
          phone: "",
          province: "",
          city: "",
          district: "",
          detail: "",
          isDefault: false,
        },
  });

  const discardDraft = useCallback(
    () => clearAddressDraft(window.sessionStorage, draftKey),
    [draftKey],
  );

  useEffect(() => {
    const draft = readAddressDraft(window.sessionStorage, draftKey);
    if (draft) {
      reset(draft, { keepDefaultValues: true });
    }
  }, [draftKey, reset]);

  useEffect(
    () =>
      subscribe({
        formState: { isDirty: true, values: true },
        callback: ({ isDirty: draftIsDirty, values }) => {
          if (draftIsDirty) {
            writeAddressDraft(window.sessionStorage, draftKey, values);
          } else {
            clearAddressDraft(window.sessionStorage, draftKey);
          }
        },
      }),
    [draftKey, subscribe],
  );

  const requiredMessage = t("validation.required");

  const onSubmit: SubmitHandler<AddressFormValues> = async (input) => {
    setErrorMessage(null);

    try {
      const payload = isEditing
        ? (
            await updateAddress({
              variables: {
                input: {
                  addressId: initialAddress.id,
                  ...input,
                },
              },
            })
          ).data?.updateAddress
        : (
            await createAddress({
              variables: { input },
            })
          ).data?.createAddress;

      const errorCode = payload?.errors[0]?.code;

      if (!payload?.data || errorCode) {
        setErrorMessage(
          errorT(
            errorCode === "ADDRESS_NOT_FOUND"
              ? "ADDRESS_NOT_FOUND"
              : "unexpected",
          ),
        );
        return;
      }

      discardDraft();

      if (isEditing) {
        reset(input);
        router.replace("/account/addresses");
      } else {
        reset();
        router.refresh();
      }
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
    <Card
      className={cn(
        "transition-colors",
        isEditing && "border-primary/50 bg-primary/[0.03] shadow-md",
      )}
    >
      <CardHeader>
        <div
          className={cn(
            "mb-1 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isEditing
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isEditing ? (
            <Pencil className="size-3" aria-hidden="true" />
          ) : (
            <Plus className="size-3" aria-hidden="true" />
          )}
          {t(isEditing ? "editMode" : "createMode")}
        </div>
        <CardTitle as="h2">
          {t(isEditing ? "editFormTitle" : "formTitle")}
        </CardTitle>
        <CardDescription>
          {t(isEditing ? "editFormDescription" : "formDescription")}
        </CardDescription>
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
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => {
                discardDraft();
                reset();
                setErrorMessage(null);
                router.replace("/account/addresses");
              }}
            >
              {t("cancel")}
            </Button>
          ) : (
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
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving") : t(isEditing ? "saveChanges" : "save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
