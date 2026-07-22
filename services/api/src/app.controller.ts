import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("health")
  async health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      productCount: await this.prisma.product.count(),
    };
  }
}
