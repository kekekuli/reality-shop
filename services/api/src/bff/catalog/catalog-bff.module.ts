import { Module } from "@nestjs/common";
import { ProductResolver } from "./product.resolver";
import { CatalogModule } from "../../modules/catalog/catalog.module";
import { SkuResolver } from "./sku.resolver";

@Module({
  imports: [CatalogModule],
  providers: [ProductResolver, SkuResolver],
})
export class CatalogBffModule {}
