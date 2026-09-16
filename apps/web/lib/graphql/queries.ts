import { graphql } from "./generated";

export const ProductsQuery = graphql(`
  query Products {
    products(first: 20) {
      edges {
        node {
          id
          slug
          title
          brand
          skus {
            skuId
            skuCode
            price
          }
        }
      }
    }
  }
`);

export const ProductQuery = graphql(`
  query Product($slug: String!) {
    product(slug: $slug) {
      id
      slug
      title
      brand
      skus {
        skuId
        skuCode
        price
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

export const AddressesQuery = graphql(`
  query Addresses {
    me {
      id
    }
    addresses {
      id
      receiverName
      phone
      province
      city
      district
      detail
      isDefault
    }
  }
`);

export const CreateAddressMutation = graphql(`
  mutation CreateAddress($input: CreateAddressInput!) {
    createAddress(input: $input) {
      data {
        id
        receiverName
        phone
        province
        city
        district
        detail
        isDefault
      }
      errors {
        code
      }
    }
  }
`);

export const UpdateAddressMutation = graphql(`
  mutation UpdateAddress($input: UpdateAddressInput!) {
    updateAddress(input: $input) {
      data {
        id
        receiverName
        phone
        province
        city
        district
        detail
        isDefault
      }
      errors {
        code
      }
    }
  }
`);

export const SetDefaultAddressMutation = graphql(`
  mutation SetDefaultAddress($input: SetDefaultAddressInput!) {
    setDefaultAddress(input: $input) {
      data {
        id
        receiverName
        phone
        province
        city
        district
        detail
        isDefault
      }
      errors {
        code
      }
    }
  }
`);

export const DeleteAddressMutation = graphql(`
  mutation DeleteAddress($input: DeleteAddressInput!) {
    deleteAddress(input: $input) {
      data {
        id
      }
      errors {
        code
      }
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
      }
    }
  }
`);

export const AddCartItemMutation = graphql(`
  mutation AddCartItem($input: AddCartItemInput!) {
    addCartItem(input: $input) {
      data {
        quantity
        skuId
      }
      errors {
        code
      }
    }
  }
`);

export const CartQuery = graphql(`
  query Cart {
    cart {
      items {
        skuId
        quantity
        sku {
          skuId
          skuCode
          price
          status
          product {
            slug
            title
            brand
            status
          }
        }
      }
    }
  }
`);

export const RemoveCartItemMutation = graphql(`
  mutation RemoveCartItem($input: RemoveCartItemInput!) {
    removeCartItem(input: $input) {
      data {
        skuId
      }
      errors {
        code
      }
    }
  }
`);

export const UpdateCartItemQuantityMutation = graphql(`
  mutation UpdateCartItemQuantity($input: UpdateCartItemQuantityInput!) {
    updateCartItemQuantity(input: $input) {
      data {
        skuId
        quantity
      }
      errors {
        code
      }
    }
  }
`);
