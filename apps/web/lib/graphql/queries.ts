import { graphql } from "./generated";

export const ProductsQuery = graphql(`
  query Products {
    products(first: 20) {
      edges {
        node {
          id
          title
          brand
          skus {
            skuCode
            price
          }
        }
      }
    }
  }
`);
