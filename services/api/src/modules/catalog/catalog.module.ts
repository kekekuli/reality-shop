import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ProductService],
  exports: [ProductService],
})
export class CatalogModule {}
