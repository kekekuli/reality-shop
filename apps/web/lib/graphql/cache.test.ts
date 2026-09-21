import { describe, expect, it } from "vitest";
import { createApolloCache } from "./cache";
import { OrdersQuery, ProductsQuery } from "./queries";

describe("cursor pagination cache policies", () => {
  it("appends product pages and keeps the latest page info", () => {
    const cache = createApolloCache();

    cache.writeQuery({
      query: ProductsQuery,
      variables: { first: 20 },
      data: {
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
      },
    });

    cache.writeQuery({
      query: ProductsQuery,
      variables: { first: 20, after: "product-1" },
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

    const result = cache.readQuery({
      query: ProductsQuery,
      variables: { first: 20 },
    });

    expect(result?.products.edges.map(({ node }) => node.id)).toEqual([
      "1",
      "2",
    ]);
    expect(result?.products.pageInfo).toMatchObject({
      hasNextPage: false,
      endCursor: "product-2",
    });
  });

  it("appends order pages without nesting duplicate connections", () => {
    const cache = createApolloCache();

    cache.writeQuery({
      query: OrdersQuery,
      variables: { first: 20 },
      data: {
        orders: {
          edges: [
            {
              cursor: "order-1",
              node: {
                orderNo: "ORDER-1",
                status: "pending_payment",
                total: "1000",
                createdAt: "2026-09-21T00:00:00.000Z",
                items: [],
              },
            },
          ],
          pageInfo: {
            hasNextPage: true,
            endCursor: "order-1",
          },
        },
      },
    });

    cache.writeQuery({
      query: OrdersQuery,
      variables: { first: 20, after: "order-1" },
      data: {
        orders: {
          edges: [
            {
              cursor: "order-2",
              node: {
                orderNo: "ORDER-2",
                status: "paid",
                total: "2000",
                createdAt: "2026-09-21T00:01:00.000Z",
                items: [],
              },
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: "order-2",
          },
        },
      },
    });

    const result = cache.readQuery({
      query: OrdersQuery,
      variables: { first: 20 },
    });

    expect(result?.orders.edges.map(({ node }) => node.orderNo)).toEqual([
      "ORDER-1",
      "ORDER-2",
    ]);
  });
});
