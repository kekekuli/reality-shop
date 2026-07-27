import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { SkuService } from "./sku.service";

@Module({
  imports: [PrismaModule],
  providers: [ProductService, SkuService],
  exports: [ProductService, SkuService],
})
export class CatalogModule {}
