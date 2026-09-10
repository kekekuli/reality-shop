import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { MutationPayload } from "../../common/graphql/mutation-payload";

@ObjectType()
export class CartItemType {
  @Field(() => ID)
  skuId!: string;

  @Field(() => Int)
  quantity!: number;
}

@ObjectType()
export class AddCartItemPayload extends MutationPayload(CartItemType) {}
