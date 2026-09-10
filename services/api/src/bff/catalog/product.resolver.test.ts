import { describe, expect, it, vi } from "vitest";
import type { Product as PrismaProduct } from "../../generated/prisma/client";
import type { ProductService } from "../../modules/catalog/product.service";
import { encodeCursor } from "../../common/graphql/cursor";
import { ProductResolver } from "./product.resolver";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
  },
}));

const product: PrismaProduct = {
  id: 1n,
  categoryId: 2n,
  slug: "phone",
  title: "Phone",
  brand: "Reality",
  attrs: {},
  status: "on_sale",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createResolver(row: PrismaProduct | null) {
  const findBySlug = vi.fn().mockResolvedValue(row);
  const service = { findBySlug } as unknown as ProductService;

  return {
    resolver: new ProductResolver(service),
    findBySlug,
  };
}

describe("ProductResolver.product", () => {
  it("maps a product returned by the service", async () => {
    const { resolver, findBySlug } = createResolver(product);

    await expect(resolver.product("phone")).resolves.toEqual({
      id: "1",
      slug: "phone",
      title: "Phone",
      brand: "Reality",
      status: "on_sale",
    });
    expect(findBySlug).toHaveBeenCalledWith("phone");
  });

  it("returns null when the service finds no product", async () => {
    const { resolver } = createResolver(null);

    await expect(resolver.product("missing")).resolves.toBeNull();
  });
});

describe("ProductResolver.products", () => {
  it("uses the first page end cursor to fetch the next page", async () => {
    const firstProduct = {
      ...product,
      id: 10n,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    };
    const nextPageProduct = {
      ...product,
      id: 9n,
      slug: "next-phone",
      title: "Next Phone",
      createdAt: new Date("2026-01-31T00:00:00.000Z"),
    };
    const findPage = vi
      .fn()
      .mockResolvedValueOnce([firstProduct, nextPageProduct])
      .mockResolvedValueOnce([nextPageProduct]);
    const resolver = new ProductResolver({
      findPage,
    } as unknown as ProductService);

    const firstPage = await resolver.products(1);

    expect(firstPage.edges).toEqual([
      {
        node: {
          id: "10",
          slug: "phone",
          title: "Phone",
          brand: "Reality",
          status: "on_sale",
        },
        cursor: encodeCursor(firstProduct.createdAt, firstProduct.id),
      },
    ]);
    expect(firstPage.pageInfo).toEqual({
      hasNextPage: true,
      endCursor: firstPage.edges[0].cursor,
    });

    const secondPage = await resolver.products(1, firstPage.pageInfo.endCursor);

    expect(secondPage).toEqual({
      edges: [
        {
          node: {
            id: "9",
            slug: "next-phone",
            title: "Next Phone",
            brand: "Reality",
            status: "on_sale",
          },
          cursor: encodeCursor(nextPageProduct.createdAt, nextPageProduct.id),
        },
      ],
      pageInfo: {
        hasNextPage: false,
        endCursor: encodeCursor(nextPageProduct.createdAt, nextPageProduct.id),
      },
    });
    expect(findPage).toHaveBeenNthCalledWith(1, {
      first: 1,
      cursor: undefined,
    });
    expect(findPage).toHaveBeenNthCalledWith(2, {
      first: 1,
      cursor: {
        sortKey: firstProduct.createdAt,
        id: firstProduct.id,
      },
    });
  });
});
