import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import type { ProductStatus } from "@reality-shop/shared-types";

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage({
    first,
    cursor,
  }: {
    first: number;
    cursor?: {
      sortKey: Date;
      id: bigint;
    };
  }) {
    const where: Prisma.ProductWhereInput = {
      // Prisma types this as plain `string` (status is text + CHECK, not a
      // native enum), so the literal is pinned against the union by hand.
      status: "on_sale" satisfies ProductStatus,
    };
    if (cursor) {
      where.OR = [
        {
          createdAt: {
            lt: cursor.sortKey,
          },
        },
        {
          createdAt: cursor.sortKey,
          id: {
            lt: cursor.id,
          },
        },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: first + 1,
    });
  }
}
