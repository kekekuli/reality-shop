import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps = Omit<ComponentProps<"input">, "className" | "name"> & {
  error?: string;
  label: string;
  name: string;
};

export function TextField({
  error,
  label,
  id,
  name,
  ...inputProps
}: TextFieldProps) {
  const inputId = id ?? name;

  return (
    <Field data-disabled={inputProps.disabled || undefined} data-invalid={!!error}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        name={name}
        aria-invalid={!!error}
        {...inputProps}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
