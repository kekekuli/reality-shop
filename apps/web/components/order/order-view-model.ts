export type OrderItemViewModel = {
  skuId: string;
  skuCode: string;
  productTitle: string;
  specs: ReadonlyArray<{ key: string; value: string }>;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
};

export type OrderSummaryItemViewModel = Pick<
  OrderItemViewModel,
  "skuId" | "productTitle" | "quantity"
>;

export type OrderSummaryViewModel = {
  orderNo: string;
  status: string;
  total: string;
  createdAt: string | Date;
  items: readonly OrderSummaryItemViewModel[];
};

export type OrderDetailViewModel = Omit<OrderSummaryViewModel, "items"> & {
  items: readonly OrderItemViewModel[];
  subtotal: string;
  shipping: string;
  paymentExpiresAt: string | Date;
  paidAt: string | Date | null;
  cancelledAt: string | Date | null;
  shippingAddress: {
    receiverName: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  };
};
