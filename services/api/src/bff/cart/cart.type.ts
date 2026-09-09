import { Field, Int, ObjectType } from "@nestjs/graphql";
import { MutationPayload } from "../../common/graphql/mutation-payload";

@ObjectType()
export class CartItemType {
  @Field(() => String)
  skuId!: string;

  @Field(() => Int)
  quantity!: number;
}

@ObjectType()
export class AddCartItemPayload extends MutationPayload(CartItemType) {}
