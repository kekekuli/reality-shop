import { InMemoryCache } from "@apollo/client-integration-nextjs";
import { relayStylePagination } from "@apollo/client/utilities";

export function createApolloCache() {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          orders: relayStylePagination(),
          products: relayStylePagination(),
        },
      },
      CartType: {
        keyFields: [],
      },
      CartItemType: {
        keyFields: ["skuId"],
      },
      Sku: {
        keyFields: ["skuId"],
      },
      OrderType: {
        keyFields: ["orderNo"],
      },
    },
  });
}
