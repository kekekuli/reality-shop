import { Module } from "@nestjs/common";
import { ProductResolver } from "./product.resolver";
import { CatalogModule } from "../../modules/catalog/catalog.module";

@Module({
  imports: [CatalogModule],
  providers: [ProductResolver],
})
export class CatalogBffModule {}
