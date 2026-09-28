import { graphql } from "./generated";

export const ProductsQuery = graphql(`
  query Products($first: Int! = 20, $after: String) {
    products(first: $first, after: $after) {
      edges {
        cursor
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
      pageInfo {
        hasNextPage
        endCursor
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
        isSelected
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
        isSelected
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

export const CheckoutQuery = graphql(`
  query Checkout {
    cart {
      items {
        skuId
        quantity
        isSelected
        sku {
          skuId
          skuCode
          price
          product {
            slug
            title
            brand
          }
        }
      }
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

export const CreateOrderMutation = graphql(`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      data {
        orderNo
      }
      errors {
        code
        addressId
        skuId
        quantity
        requestedQuantity
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

export const UpdateCartItemMutation = graphql(`
  mutation UpdateCartItem($input: UpdateCartItemInput!) {
    updateCartItem(input: $input) {
      data {
        skuId
        quantity
        isSelected
      }
      errors {
        code
      }
    }
  }
`);

export const OrdersQuery = graphql(`
  query Orders($first: Int! = 20, $after: String) {
    orders(first: $first, after: $after) {
      edges {
        cursor
        node {
          orderNo
          status
          total
          createdAt
          items {
            skuId
            productTitle
            quantity
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const OrderQuery = graphql(`
  query Order($orderNo: ID!) {
    order(orderNo: $orderNo) {
      orderNo
      status
      subtotal
      shipping
      total
      paymentExpiresAt
      paidAt
      cancelledAt
      createdAt
      shippingAddress {
        receiverName
        phone
        province
        city
        district
        detail
      }
      items {
        skuId
        skuCode
        productTitle
        specs {
          key
          value
        }
        unitPrice
        quantity
        lineTotal
      }
    }
  }
`);
