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

export const MeQuery = graphql(`
  query Me {
    me {
      id
      email
      displayName
    }
  }
`);

export const LoginMutation = graphql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      data {
        user {
          id
          email
          displayName
        }
      }
      errors {
        code
        message
      }
    }
  }
`);

export const RegisterMutation = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      data {
        user {
          id
          email
          displayName
        }
      }
      errors {
        code
        message
      }
    }
  }
`);

export const RefreshMutation = graphql(`
  mutation Refresh {
    refresh {
      data {
        refreshed
      }
      errors {
        code
        message
      }
    }
  }
`);

export const LogoutMutation = graphql(`
  mutation Logout {
    logout {
      data {
        loggedOut
      }
      errors {
        code
        message
      }
    }
  }
`);
