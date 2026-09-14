"use client";

import { LoaderCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { AddCartItemMutation } from "@/lib/graphql/queries";

type AddCartItemButtonProps = {
  sku: {
    skuId: string;
    skuCode: string;
  };
};

export function AddCartItemButton({ sku }: AddCartItemButtonProps) {
  const t = useTranslations("cart");
  const errorT = useTranslations("error");
  const [quantity, setQuantity] = useState("1");
  const parsedQuantity = Number(quantity);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isQuantityValid =
    Number.isInteger(parsedQuantity) && parsedQuantity > 0;

  const [addCartItem, { loading }] = useMutation(AddCartItemMutation);

  async function handleAddCartItem() {
    if (loading || !isQuantityValid) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await addCartItem({
        variables: {
          input: {
            skuId: sku.skuId,
            quantity: parsedQuantity,
          },
        },
      });
      const payload = res.data;
      const errorCode = payload?.addCartItem.errors[0]?.code;

      if (errorCode) {
        switch (errorCode) {
          case "INVALID_QUANTITY":
          case "SKU_NOT_FOUND":
          case "CART_QUANTITY_LIMIT_EXCEED":
            setErrorMessage(errorT(errorCode));
            break;
          default:
            setErrorMessage(errorT("unexpected"));
        }
        return;
      }

      if (!payload?.addCartItem.data) {
        setErrorMessage(errorT("unexpected"));
        return;
      }

      setSuccessMessage(
        t("addedItem", { quantity: parsedQuantity, sku: sku.skuCode }),
      );
      setQuantity("1");
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
  }

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:items-end">
      <div className="flex w-32 items-center justify-between gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={loading || !isQuantityValid || parsedQuantity === 1}
          aria-label={t("decreaseQuantity")}
          onClick={() => setQuantity(String(parsedQuantity - 1))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Input
          className="h-7 w-16 text-center"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          aria-label={t("quantity")}
          aria-invalid={!isQuantityValid}
          disabled={loading}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={loading}
          aria-label={t("increaseQuantity")}
          onClick={() =>
            setQuantity(String(isQuantityValid ? parsedQuantity + 1 : 1))
          }
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      <Button
        className="w-32"
        type="button"
        disabled={loading || !isQuantityValid}
        aria-busy={loading}
        data-sku-id={sku.skuId}
        data-quantity={isQuantityValid ? parsedQuantity : undefined}
        onClick={handleAddCartItem}
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <ShoppingCart aria-hidden="true" />
        )}
        {loading ? t("addingItem") : t("addItem")}
      </Button>

      {errorMessage && <FieldError className="w-32">{errorMessage}</FieldError>}
      {successMessage && (
        <p
          role="status"
          aria-live="polite"
          className="w-32 text-sm text-muted-foreground"
        >
          {successMessage}
        </p>
      )}
    </div>
  );
}
