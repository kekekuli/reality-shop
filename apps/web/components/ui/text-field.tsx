import type { ComponentProps } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps = Omit<ComponentProps<"input">, "className" | "name"> & {
  label: string;
  name: string;
};

export function TextField({ label, id, name, ...inputProps }: TextFieldProps) {
  const inputId = id ?? name;

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input id={inputId} name={name} {...inputProps} />
    </Field>
  );
}
