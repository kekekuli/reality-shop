import { ApolloClient, ApolloLink, Observable } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApolloCache } from "@/lib/graphql/cache";
import { ProductsQuery } from "@/lib/graphql/queries";
import messages from "@/messages/en.json";
import { ProductsList } from "./products-list";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

const firstPage = {
  products: {
    edges: [
      {
        cursor: "product-1",
        node: {
          id: "1",
          slug: "first-product",
          title: "First product",
          brand: "Reality",
          skus: [],
        },
      },
    ],
    pageInfo: {
      hasNextPage: true,
      endCursor: "product-1",
    },
  },
};

describe("ProductsList", () => {
  it("fetches and appends the next page", async () => {
    const requestedCursors: unknown[] = [];
    const link = new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requestedCursors.push(operation.variables.after);
          observer.next({
            data: {
              products: {
                edges: [
                  {
                    cursor: "product-2",
                    node: {
                      id: "2",
                      slug: "second-product",
                      title: "Second product",
                      brand: "Reality",
                      skus: [],
                    },
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: "product-2",
                },
              },
            },
          });
          observer.complete();
        }),
    );
    const cache = createApolloCache();
    cache.writeQuery({
      query: ProductsQuery,
      variables: { first: 20 },
      data: firstPage,
    });
    const client = new ApolloClient({ cache, link });

    render(
      <NextIntlClientProvider
        locale="en"
        messages={{ catalog: messages.catalog }}
      >
        <ApolloProvider client={client}>
          <ProductsList />
        </ApolloProvider>
      </NextIntlClientProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: messages.catalog.loadMore }),
    );

    expect(await screen.findByText("Second product")).toBeInTheDocument();
    expect(screen.getByText("First product")).toBeInTheDocument();
    expect(requestedCursors).toEqual(["product-1"]);
    expect(
      screen.queryByRole("button", { name: messages.catalog.loadMore }),
    ).not.toBeInTheDocument();
  });
});
