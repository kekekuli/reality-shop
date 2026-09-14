import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "../../prisma/prisma.service";
import { ProductService } from "./product.service";

vi.mock("../../env", () => ({
  env: {
    DATABASE_URL: "postgresql://unused-in-unit-tests",
  },
}));

describe("ProductService.findPage", () => {
  it("loads one extra on-sale product to detect a next page", async () => {
    const rows = [{ id: 3n }, { id: 2n }, { id: 1n }];
    const findMany = vi.fn().mockResolvedValue(rows);
    const service = new ProductService({
      product: { findMany },
    } as unknown as PrismaService);

    await expect(service.findPage({ first: 2 })).resolves.toBe(rows);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "on_sale" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
    });
  });

  it("continues after a compound createdAt and id cursor", async () => {
    const cursor = {
      sortKey: new Date("2026-01-01T00:00:00.000Z"),
      id: 42n,
    };
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new ProductService({
      product: { findMany },
    } as unknown as PrismaService);

    await service.findPage({ first: 20, cursor });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: "on_sale",
        OR: [
          { createdAt: { lt: cursor.sortKey } },
          {
            createdAt: cursor.sortKey,
            id: { lt: cursor.id },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
    });
  });
});

describe("ProductService.findBySlug", () => {
  it("looks up only an on-sale product", async () => {
    const product = { id: 1n, slug: "phone" };
    const findUnique = vi.fn().mockResolvedValue(product);
    const service = new ProductService({
      product: { findUnique },
    } as unknown as PrismaService);

    await expect(service.findBySlug("phone")).resolves.toBe(product);
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        slug: "phone",
        status: "on_sale",
      },
    });
  });

  it("returns null when no on-sale product matches", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new ProductService({
      product: { findUnique },
    } as unknown as PrismaService);

    await expect(service.findBySlug("missing")).resolves.toBeNull();
  });
});
