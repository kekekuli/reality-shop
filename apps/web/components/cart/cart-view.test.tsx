import {
  ApolloClient,
  ApolloLink,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { createApolloCache } from "@/lib/graphql/cache";
import { CartQuery } from "@/lib/graphql/queries";
import type { ErrorCode } from "@/lib/graphql/generated/graphql";
import { CartView } from "./cart-view";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

const cartData = {
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
          status: "ACTIVE",
          product: {
            __typename: "Product" as const,
            slug: "reality-phone",
            title: "Reality Phone",
            brand: "Reality",
            status: "ACTIVE",
          },
        },
      },
    ],
  },
};

function controlledMutation() {
  let succeed = () => {};
  let fail = () => {};
  let requestCount = 0;
  const link = new ApolloLink(
    () =>
      new Observable((observer) => {
        requestCount += 1;
        succeed = () => {
          observer.next({
            data: {
              removeCartItem: {
                data: { skuId: "7" },
                errors: [],
              },
            },
          });
          observer.complete();
        };
        fail = () => observer.error(new Error("private network detail"));
      }),
  );

  return {
    link,
    get requestCount() {
      return requestCount;
    },
    succeed: () => succeed(),
    fail: () => fail(),
  };
}

function controlledQuantityMutation() {
  let succeed = (quantity: number) => void quantity;
  let reject = (code: ErrorCode) => void code;
  let fail = () => {};
  const quantities: number[] = [];
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const quantity = operation.variables.input.quantity as number;
        quantities.push(quantity);
        succeed = (confirmedQuantity) => {
          observer.next({
            data: {
              updateCartItem: {
                data: {
                  skuId: "7",
                  quantity: confirmedQuantity,
                  isSelected: true,
                },
                errors: [],
              },
            },
          });
          observer.complete();
        };
        reject = (code) => {
          observer.next({
            data: {
              updateCartItem: {
                data: null,
                errors: [{ code }],
              },
            },
          });
          observer.complete();
        };
        fail = () => observer.error(new Error("private network detail"));
      }),
  );

  return {
    link,
    quantities,
    succeed: (quantity: number) => succeed(quantity),
    reject: (code: ErrorCode) => reject(code),
    fail: () => fail(),
  };
}

function controlledConcurrentQuantityMutations() {
  const pending = new Map<
    string,
    {
      succeed: () => void;
      fail: () => void;
    }
  >();
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { skuId, quantity } = operation.variables.input as {
          skuId: string;
          quantity: number;
        };

        pending.set(skuId, {
          succeed: () => {
            observer.next({
              data: {
                updateCartItem: {
                  data: { skuId, quantity, isSelected: true },
                  errors: [],
                },
              },
            });
            observer.complete();
          },
          fail: () => observer.error(new Error("private network detail")),
        });
      }),
  );

  return {
    link,
    succeed(skuId: string) {
      pending.get(skuId)?.succeed();
    },
    fail(skuId: string) {
      pending.get(skuId)?.fail();
    },
  };
}

function cartDataWithQuantity(quantity: number) {
  return {
    ...cartData,
    cart: {
      ...cartData.cart,
      items: cartData.cart.items.map((item) => ({ ...item, quantity })),
    },
  };
}

function cartDataWithSecondItem() {
  return {
    ...cartData,
    cart: {
      ...cartData.cart,
      items: [
        ...cartData.cart.items,
        {
          ...cartData.cart.items[0],
          skuId: "8",
          quantity: 1,
          sku: {
            ...cartData.cart.items[0].sku,
            skuId: "8",
            skuCode: "buds-black",
            price: "19900",
            product: {
              ...cartData.cart.items[0].sku.product,
              slug: "reality-buds",
              title: "Reality Buds",
            },
          },
        },
      ],
    },
  };
}

function renderCart(link: ApolloLink, data = cartData) {
  const cache = createApolloCache();
  cache.writeQuery({ query: CartQuery, data });
  const client = new ApolloClient({ cache, link });

  const result = render(
    <NextIntlClientProvider
      locale="en"
      messages={{ cart: messages.cart, error: messages.error }}
    >
      <ApolloProvider client={client}>
        <CartView />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );

  return { ...result, client };
}

describe("CartView", () => {
  it("coalesces rapid quantity changes into the final value", async () => {
    vi.useFakeTimers();

    try {
      const mutation = controlledQuantityMutation();
      const { client } = renderCart(mutation.link);
      const increaseName = messages.cart.increaseItemQuantity.replace(
        "{sku}",
        "phone-128gb",
      );

      fireEvent.click(screen.getByRole("button", { name: increaseName }));
      fireEvent.click(screen.getByRole("button", { name: increaseName }));
      fireEvent.click(screen.getByRole("button", { name: increaseName }));
      act(() => vi.advanceTimersByTime(0));
      await act(async () => Promise.resolve());

      expect(
        client.readQuery({ query: CartQuery })?.cart.items[0]?.quantity,
      ).toBe(5);
      expect(screen.getByRole("spinbutton")).toHaveValue(5);
      expect(mutation.quantities).toEqual([]);

      await act(async () => vi.advanceTimersByTimeAsync(250));
      expect(mutation.quantities).toEqual([5]);

      await act(async () => mutation.succeed(5));
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends only one trailing update for changes made in flight", async () => {
    vi.useFakeTimers();

    try {
      const mutation = controlledQuantityMutation();
      renderCart(mutation.link);
      const increaseName = messages.cart.increaseItemQuantity.replace(
        "{sku}",
        "phone-128gb",
      );

      fireEvent.click(screen.getByRole("button", { name: increaseName }));
      await act(async () => vi.advanceTimersByTimeAsync(250));
      expect(mutation.quantities).toEqual([3]);

      fireEvent.click(screen.getByRole("button", { name: increaseName }));
      fireEvent.click(screen.getByRole("button", { name: increaseName }));
      act(() => vi.advanceTimersByTime(250));
      expect(mutation.quantities).toEqual([3]);

      await act(async () => mutation.succeed(3));
      await act(async () => vi.advanceTimersByTimeAsync(250));
      expect(mutation.quantities).toEqual([3, 5]);

      await act(async () => mutation.succeed(5));
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores the confirmed item after an update request fails", async () => {
    vi.useFakeTimers();

    try {
      const mutation = controlledQuantityMutation();
      renderCart(mutation.link);

      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "phone-128gb",
          ),
        }),
      );
      act(() => vi.advanceTimersByTime(0));
      await act(async () => Promise.resolve());
      expect(screen.getByRole("spinbutton")).toHaveValue(3);

      await act(async () => vi.advanceTimersByTimeAsync(250));
      await act(async () => mutation.fail());
      act(() => vi.advanceTimersByTime(0));
      await act(async () => Promise.resolve());

      expect(screen.getByRole("spinbutton")).toHaveValue(2);
      expect(screen.getByText(messages.error.network)).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not clear one item's error when another item succeeds", async () => {
    vi.useFakeTimers();

    try {
      const mutations = controlledConcurrentQuantityMutations();
      renderCart(mutations.link, cartDataWithSecondItem());

      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "phone-128gb",
          ),
        }),
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "buds-black",
          ),
        }),
      );

      await act(async () => vi.advanceTimersByTimeAsync(250));
      await act(async () => mutations.fail("7"));
      expect(screen.getByText(messages.error.network)).toBeVisible();

      await act(async () => mutations.succeed("8"));
      expect(screen.getByText(messages.error.network)).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes an item when the server reports it no longer exists", async () => {
    vi.useFakeTimers();

    try {
      const mutation = controlledQuantityMutation();
      renderCart(mutation.link);

      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "phone-128gb",
          ),
        }),
      );

      await act(async () => vi.advanceTimersByTimeAsync(250));
      await act(async () => mutation.reject("CART_ITEM_NOT_FOUND"));
      act(() => vi.advanceTimersByTime(0));
      await act(async () => Promise.resolve());

      expect(screen.queryByText("Reality Phone")).not.toBeInTheDocument();
      expect(
        screen.getByText(messages.error.CART_ITEM_NOT_FOUND),
      ).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not decrement an item below one", () => {
    renderCart(
      new ApolloLink(() => new Observable(() => undefined)),
      cartDataWithQuantity(1),
    );

    expect(
      screen.getByRole("button", {
        name: messages.cart.decreaseItemQuantity.replace(
          "{sku}",
          "phone-128gb",
        ),
      }),
    ).toBeDisabled();
  });

  it("updates one item while another item has a pending optimistic removal", async () => {
    vi.useFakeTimers();

    try {
      const removeMutation = controlledMutation();
      const { client } = renderCart(
        removeMutation.link,
        cartDataWithSecondItem(),
      );

      fireEvent.click(
        screen.getAllByRole("button", { name: messages.cart.removeItem })[0]!,
      );
      expect(screen.queryByText("Reality Phone")).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "buds-black",
          ),
        }),
      );
      act(() => vi.advanceTimersByTime(0));
      await act(async () => Promise.resolve());

      expect(
        client.cache
          .readQuery({ query: CartQuery, optimistic: true })
          ?.cart.items.find((item) => item.skuId === "8")?.quantity,
      ).toBe(2);
      expect(
        screen.getByRole("spinbutton", {
          name: messages.cart.itemQuantity.replace("{sku}", "buds-black"),
        }),
      ).toHaveValue(2);
      expect(removeMutation.requestCount).toBe(1);

      await act(async () => removeMutation.succeed());
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes an item before the mutation response arrives", async () => {
    const mutation = controlledMutation();
    const user = userEvent.setup();
    renderCart(mutation.link);

    await user.click(
      screen.getByRole("button", { name: messages.cart.removeItem }),
    );

    expect(screen.queryByText("Reality Phone")).not.toBeInTheDocument();
    expect(screen.getByText(messages.cart.emptyTitle)).toBeVisible();
    expect(mutation.requestCount).toBe(1);

    await act(async () => mutation.succeed());
    expect(screen.queryByText("Reality Phone")).not.toBeInTheDocument();
  });

  it("rolls the optimistic removal back after a network error", async () => {
    const mutation = controlledMutation();
    const user = userEvent.setup();
    renderCart(mutation.link);

    await user.click(
      screen.getByRole("button", { name: messages.cart.removeItem }),
    );
    expect(screen.queryByText("Reality Phone")).not.toBeInTheDocument();

    await act(async () => mutation.fail());

    expect(await screen.findByText("Reality Phone")).toBeVisible();
    expect(screen.getByText(messages.error.network)).toBeVisible();
  });

  it("restores the confirmed quantity when a pending update is cancelled by removal", async () => {
    vi.useFakeTimers();

    try {
      const mutation = controlledMutation();
      renderCart(mutation.link);

      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "phone-128gb",
          ),
        }),
      );
      act(() => vi.advanceTimersByTime(0));
      await act(async () => Promise.resolve());
      expect(screen.getByRole("spinbutton")).toHaveValue(3);

      fireEvent.click(
        screen.getByRole("button", { name: messages.cart.removeItem }),
      );
      expect(screen.queryByText("Reality Phone")).not.toBeInTheDocument();

      await act(async () => mutation.fail());

      expect(screen.getByText("Reality Phone")).toBeVisible();
      expect(screen.getByRole("spinbutton")).toHaveValue(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores the confirmed quantity when unmounted before the deferred update", () => {
    vi.useFakeTimers();

    try {
      const { client, unmount } = renderCart(
        new ApolloLink(() => new Observable(() => undefined)),
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: messages.cart.increaseItemQuantity.replace(
            "{sku}",
            "phone-128gb",
          ),
        }),
      );
      expect(
        client.readQuery({ query: CartQuery })?.cart.items[0]?.quantity,
      ).toBe(3);

      unmount();

      expect(
        client.readQuery({ query: CartQuery })?.cart.items[0]?.quantity,
      ).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
