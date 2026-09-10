import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt } from "class-validator";

@InputType()
export class AddCartItemInput {
  @Field(() => ID)
  skuId!: string;

  @Field(() => Int)
  @IsInt()
  quantity!: number;
}
