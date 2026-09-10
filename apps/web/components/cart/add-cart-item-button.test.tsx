import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
import { NextIntlClientProvider } from "next-intl";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import messages from "@/messages/en.json";
import { AddCartItemMutation } from "@/lib/graphql/queries";
import { AddCartItemButton } from "./add-cart-item-button";

const sku = {
  skuId: "7",
  skuCode: "phone-128gb",
};

function renderButton(link: ApolloLink = new MockLink([])) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link,
  });

  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{ cart: messages.cart, error: messages.error }}
    >
      <ApolloProvider client={client}>
        <AddCartItemButton sku={sku} />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );
}

function mutationMock(
  quantity: number,
  addCartItem: {
    data: { skuId: string; quantity: number } | null;
    errors: Array<{ code: string }>;
  },
) {
  return {
    request: {
      query: AddCartItemMutation,
      variables: { input: { skuId: sku.skuId, quantity } },
    },
    result: { data: { addCartItem } },
  };
}

describe("AddCartItemButton", () => {
  it("starts at one and changes quantity with the stepper", async () => {
    const user = userEvent.setup();
    renderButton();

    const input = screen.getByLabelText(messages.cart.quantity);
    const decrease = screen.getByRole("button", {
      name: messages.cart.decreaseQuantity,
    });

    expect(input).toHaveValue(1);
    expect(decrease).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: messages.cart.increaseQuantity }),
    );
    expect(input).toHaveValue(2);
    expect(decrease).toBeEnabled();

    await user.click(decrease);
    expect(input).toHaveValue(1);
  });

  it("does not submit an empty or non-integer quantity", () => {
    renderButton();

    const input = screen.getByLabelText(messages.cart.quantity);
    const submit = screen.getByRole("button", {
      name: messages.cart.addItem,
    });

    fireEvent.change(input, { target: { value: "" } });
    expect(submit).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(input, { target: { value: "1.5" } });
    expect(submit).toBeDisabled();
  });

  it("sends the selected SKU and quantity, then confirms and resets", async () => {
    const user = userEvent.setup();
    renderButton(
      new MockLink([
        mutationMock(2, {
          data: { skuId: sku.skuId, quantity: 2 },
          errors: [],
        }),
      ]),
    );

    await user.click(
      screen.getByRole("button", { name: messages.cart.increaseQuantity }),
    );
    await user.click(
      screen.getByRole("button", { name: messages.cart.addItem }),
    );

    expect(
      await screen.findByText(
        messages.cart.addedItem
          .replace("{quantity}", "2")
          .replace("{sku}", sku.skuCode),
      ),
    ).toBeVisible();
    expect(screen.getByLabelText(messages.cart.quantity)).toHaveValue(1);
  });

  it("disables every control while the mutation is pending", async () => {
    const user = userEvent.setup();
    let releaseResponse!: () => void;
    let requestCount = 0;
    const link = new ApolloLink(() => {
      requestCount += 1;

      return new Observable((observer) => {
        releaseResponse = () => {
          observer.next({
            data: {
              addCartItem: {
                data: { skuId: sku.skuId, quantity: 1 },
                errors: [],
              },
            },
          });
          observer.complete();
        };
      });
    });
    renderButton(link);

    await user.click(
      screen.getByRole("button", { name: messages.cart.addItem }),
    );

    const pendingButton = screen.getByRole("button", {
      name: messages.cart.addingItem,
    });

    expect(pendingButton).toBeDisabled();
    expect(screen.getByLabelText(messages.cart.quantity)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: messages.cart.decreaseQuantity }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: messages.cart.increaseQuantity }),
    ).toBeDisabled();

    await user.click(pendingButton);
    expect(requestCount).toBe(1);

    await act(async () => releaseResponse());
  });

  it.each([
    "INVALID_QUANTITY",
    "SKU_NOT_FOUND",
    "CART_QUANTITY_LIMIT_EXCEED",
  ] as const)("shows the localized %s business error", async (code) => {
    const user = userEvent.setup();
    renderButton(
      new MockLink([
        mutationMock(1, {
          data: null,
          errors: [{ code }],
        }),
      ]),
    );

    await user.click(
      screen.getByRole("button", { name: messages.cart.addItem }),
    );

    expect(await screen.findByText(messages.error[code])).toBeVisible();
  });

  it("distinguishes an unauthenticated GraphQL error from a network error", async () => {
    const user = userEvent.setup();
    renderButton(
      new MockLink([
        {
          request: {
            query: AddCartItemMutation,
            variables: { input: { skuId: sku.skuId, quantity: 1 } },
          },
          result: {
            errors: [
              new GraphQLError("Unauthorized", {
                extensions: { code: "UNAUTHENTICATED" },
              }),
            ],
          },
        },
      ]),
    );

    await user.click(
      screen.getByRole("button", { name: messages.cart.addItem }),
    );

    expect(
      await screen.findByText(messages.error.UNAUTHENTICATED),
    ).toBeVisible();
    expect(screen.queryByText(messages.error.network)).not.toBeInTheDocument();
  });

  it("shows the localized network error", async () => {
    const user = userEvent.setup();
    renderButton(
      new MockLink([
        {
          request: {
            query: AddCartItemMutation,
            variables: { input: { skuId: sku.skuId, quantity: 1 } },
          },
          error: new Error("private network detail"),
        },
      ]),
    );

    await user.click(
      screen.getByRole("button", { name: messages.cart.addItem }),
    );

    expect(await screen.findByText(messages.error.network)).toBeVisible();
    expect(
      screen.queryByText("private network detail"),
    ).not.toBeInTheDocument();
  });
});
