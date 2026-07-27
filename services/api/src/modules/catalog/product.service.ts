import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";

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
      status: "on_sale",
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
