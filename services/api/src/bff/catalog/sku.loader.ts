import DataLoader from "dataloader";
import type { Sku as PrismaSku } from "../../generated/prisma/client";
import { SkuService } from "../../modules/catalog/sku.service";

export function createSkusByProductIdLoader(skuService: SkuService) {
  return new DataLoader<bigint, PrismaSku[]>(async (productIds) => {
    const skus = await skuService.findByProductIDs([...productIds]);
    const byProducts = new Map<bigint, PrismaSku[]>();
    for (const sku of skus) {
      const arr = byProducts.get(sku.productId) ?? [];
      arr.push(sku);
      byProducts.set(sku.productId, arr);
    }
    return productIds.map((id) => byProducts.get(id) ?? []);
  });
}

export function createSkuByIdLoader(skuService: SkuService) {
  return new DataLoader<bigint, PrismaSku>(async (ids) => {
    const skus = await skuService.findByIds([...ids]);
    const byId = new Map(skus.map((sku) => [sku.id, sku]));

    return ids.map(
      (id) => byId.get(id) ?? new Error(`SKU ${id.toString()} not found`),
    );
  });
}
