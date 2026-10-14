import { ApolloClient, ApolloLink, Observable } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApolloCache } from "@/lib/graphql/cache";
import { CheckoutQuery } from "@/lib/graphql/queries";
import messages from "@/messages/en.json";
import { CheckoutView } from "./checkout-view";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push }),
}));

const checkoutData = {
  cart: {
    __typename: "CartType" as const,
    items: [
      {
        __typename: "CartItemType" as const,
        skuId: "7",
        quantity: 2,
        isSelected: true,
        sku: {
          __typename: "Sku" as const,
          skuId: "7",
          skuCode: "phone-128gb",
          price: "129900",
          product: {
            __typename: "Product" as const,
            slug: "reality-phone",
            title: "Reality Phone",
            brand: "Reality",
          },
        },
      },
      {
        __typename: "CartItemType" as const,
        skuId: "8",
        quantity: 1,
        isSelected: false,
        sku: {
          __typename: "Sku" as const,
          skuId: "8",
          skuCode: "phone-256gb",
          price: "149900",
          product: {
            __typename: "Product" as const,
            slug: "reality-phone",
            title: "Reality Phone",
            brand: "Reality",
          },
        },
      },
    ],
  },
  addresses: [
    {
      __typename: "AddressType" as const,
      id: "10",
      receiverName: "First address",
      phone: "10000000000",
      province: "Shanghai",
      city: "Shanghai",
      district: "Pudong",
      detail: "First road",
      isDefault: false,
    },
    {
      __typename: "AddressType" as const,
      id: "11",
      receiverName: "Default address",
      phone: "11111111111",
      province: "Shanghai",
      city: "Shanghai",
      district: "Xuhui",
      detail: "Second road",
      isDefault: true,
    },
  ],
};

function renderCheckout(link: ApolloLink, data = checkoutData) {
  const cache = createApolloCache();
  cache.writeQuery({ query: CheckoutQuery, data });
  const client = new ApolloClient({ cache, link });

  const result = render(
    <NextIntlClientProvider
      locale="en"
      messages={{
        checkout: messages.checkout,
        address: messages.address,
        error: messages.error,
      }}
    >
      <ApolloProvider client={client}>
        <CheckoutView />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );

  return { ...result, client };
}

describe("CheckoutView", () => {
  beforeEach(() => push.mockReset());

  it("creates an order with the default address after final confirmation", async () => {
    let variables: Record<string, unknown> | undefined;
    const link = new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          variables = operation.variables;
          observer.next({
            data: {
              createOrder: {
                data: { orderNo: "ORDER-1" },
                errors: [],
              },
            },
          });
          observer.complete();
        }),
    );
    const user = userEvent.setup();

    const { client } = renderCheckout(link);

    expect(variables).toBeUndefined();
    expect(
      screen.getByRole("radio", { name: /Default address/ }),
    ).toBeChecked();
    expect(screen.getAllByText("¥2598.00")).toHaveLength(3);
    expect(screen.queryByText("¥4097.00")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: messages.checkout.placeOrder }),
    );

    expect(variables).toEqual({
      input: {
        addressId: "11",
        items: [{ skuId: "7", quantity: 2 }],
      },
    });
    expect(push).toHaveBeenCalledWith("/orders/ORDER-1");
    expect(client.readQuery({ query: CheckoutQuery })?.cart.items).toEqual([]);
  });

  it("requires an address before the order can be placed", () => {
    renderCheckout(new ApolloLink(() => new Observable(() => undefined)), {
      ...checkoutData,
      addresses: [],
    });

    expect(
      screen.getByRole("button", { name: messages.checkout.placeOrder }),
    ).toBeDisabled();
    expect(screen.getByText(messages.checkout.noAddress)).toBeVisible();
  });

  it("requires at least one selected item", () => {
    renderCheckout(new ApolloLink(() => new Observable(() => undefined)), {
      ...checkoutData,
      cart: {
        ...checkoutData.cart,
        items: checkoutData.cart.items.map((item) => ({
          ...item,
          isSelected: false,
        })),
      },
    });

    expect(
      screen.getByRole("button", { name: messages.checkout.placeOrder }),
    ).toBeDisabled();
  });

  it("updates an item's selection from the checkout page", async () => {
    const user = userEvent.setup();

    renderCheckout(new ApolloLink(() => new Observable(() => undefined)));

    const selectedItem = screen.getByRole("checkbox", {
      name: messages.checkout.selectItem.replace("{sku}", "phone-128gb"),
    });

    await user.click(selectedItem);

    expect(selectedItem).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: messages.checkout.placeOrder }),
    ).toBeDisabled();
  });

});
