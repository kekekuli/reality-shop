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
}
