import { InMemoryCache } from "@apollo/client-integration-nextjs";

export function createApolloCache() {
  return new InMemoryCache({
    typePolicies: {
      CartType: {
        keyFields: [],
      },
      CartItemType: {
        keyFields: ["skuId"],
      },
      Sku: {
        keyFields: ["skuId"],
      },
    },
  });
}
