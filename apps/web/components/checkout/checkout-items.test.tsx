import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { CheckoutItems, type CheckoutItem } from "./checkout-items";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

const item = {
  skuId: "7",
  quantity: 2,
  isSelected: true,
  sku: {
    skuId: "7",
    skuCode: "phone-128gb",
    price: "129900",
    product: {
      slug: "reality-phone",
      title: "Reality Phone",
      brand: "Reality",
    },
  },
} satisfies CheckoutItem;

function renderItems(props?: Partial<ComponentProps<typeof CheckoutItems>>) {
  const onQuantityChangeAction = vi.fn();
  const onSelectionChangeAction = vi.fn();

  render(
    <NextIntlClientProvider
      locale="en"
      messages={{ checkout: messages.checkout }}
    >
      <CheckoutItems
        items={[item]}
        onQuantityChangeAction={onQuantityChangeAction}
        onSelectionChangeAction={onSelectionChangeAction}
        {...props}
      />
    </NextIntlClientProvider>,
  );

  return { onQuantityChangeAction, onSelectionChangeAction };
}

describe("CheckoutItems", () => {
  it("renders the persisted selection and quantity", () => {
    renderItems();

    expect(
      screen.getByRole("checkbox", {
        name: messages.checkout.selectItem.replace("{sku}", "phone-128gb"),
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("spinbutton", {
        name: messages.checkout.itemQuantity.replace("{sku}", "phone-128gb"),
      }),
    ).toHaveValue(2);
  });

  it("reports selection and quantity changes to its owner", async () => {
    const user = userEvent.setup();
    const { onQuantityChangeAction, onSelectionChangeAction } = renderItems();

    await user.click(
      screen.getByRole("checkbox", {
        name: messages.checkout.selectItem.replace("{sku}", "phone-128gb"),
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: messages.checkout.increaseItemQuantity.replace(
          "{sku}",
          "phone-128gb",
        ),
      }),
    );

    expect(onSelectionChangeAction).toHaveBeenCalledWith(item, false);
    expect(onQuantityChangeAction).toHaveBeenCalledWith(item, 3);
  });

  it("disables controls while checkout is busy", () => {
    renderItems({ disabled: true });

    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toBeDisabled();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
