"use client";

import { LoaderCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

type AddCartItemButtonProps = {
  skuId: string;
  label: string;
  pendingLabel: string;
  pending?: boolean;
  errorMessage?: string | null;
};

export function AddCartItemButton({
  skuId,
  label,
  pendingLabel,
  pending = false,
  errorMessage,
}: AddCartItemButtonProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        data-sku-id={skuId}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <ShoppingCart aria-hidden="true" />
        )}
        {pending ? pendingLabel : label}
      </Button>

      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </div>
  );
}
