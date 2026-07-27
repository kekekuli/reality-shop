import DataLoader from "dataloader";
import { Sku as PrismaSku } from "../../generated/prisma/client";
import { SkuService } from "../../modules/catalog/sku.service";

export function createSkusLoader(skuService: SkuService) {
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
