import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt } from "class-validator";

@InputType()
export class AddCartItemInput {
  @Field(() => String)
  skuId!: string;

  @Field(() => Int)
  @IsInt()
  quantity!: number;
}
