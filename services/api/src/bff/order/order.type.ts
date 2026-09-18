import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Cents } from "../../common/graphql/cents.scalar";
import { Paginated } from "../../common/graphql/connection";
import { ErrorCode } from "../../common/errors/error-code";

@ObjectType()
export class OrderItemSpecType {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string;
}

@ObjectType()
export class OrderItemType {
  @Field(() => ID)
  skuId!: string;

  @Field(() => String)
  skuCode!: string;

  @Field(() => String)
  productTitle!: string;

  @Field(() => [OrderItemSpecType])
  specs!: OrderItemSpecType[];

  @Field(() => Cents)
  unitPrice!: bigint;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Cents)
  lineTotal!: bigint;
}

@ObjectType()
export class ShippingAddressType {
  @Field(() => String)
  receiverName!: string;

  @Field(() => String)
  phone!: string;

  @Field(() => String)
  province!: string;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  district!: string;

  @Field(() => String)
  detail!: string;
}

@ObjectType()
export class OrderType {
  @Field(() => ID)
  orderNo!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Cents)
  subtotal!: bigint;

  @Field(() => Cents)
  shipping!: bigint;

  @Field(() => Cents)
  total!: bigint;

  @Field(() => String)
  currency!: string;

  @Field(() => ShippingAddressType)
  shippingAddress!: ShippingAddressType;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];

  @Field(() => Date)
  paymentExpiresAt!: Date;

  @Field(() => Date, { nullable: true })
  paidAt!: Date | null;

  @Field(() => Date, { nullable: true })
  cancelledAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class OrderConnection extends Paginated(OrderType) {}

@ObjectType()
export class CreateOrderErrorType {
  @Field(() => ErrorCode)
  code!: ErrorCode;

  @Field(() => ID, { nullable: true })
  addressId?: string;

  @Field(() => ID, { nullable: true })
  skuId?: string;

  @Field(() => Int, { nullable: true })
  quantity?: number;

  @Field(() => Int, { nullable: true })
  requestedQuantity?: number;
}

@ObjectType()
export class CreateOrderPayload {
  @Field(() => OrderType, { nullable: true })
  data?: OrderType;

  @Field(() => [CreateOrderErrorType])
  errors!: CreateOrderErrorType[];
}
