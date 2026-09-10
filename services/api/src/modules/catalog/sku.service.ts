import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SkuService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductIDs(productIds: bigint[]) {
    return this.prisma.sku.findMany({
      where: {
        productId: {
          in: productIds,
        },
      },
    });
  }
  async findByIds(ids: bigint[]) {
    if (ids.length === 0) {
      return [];
    }
    return this.prisma.sku.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
