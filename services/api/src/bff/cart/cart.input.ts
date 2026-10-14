import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsBoolean, IsInt, ValidateIf } from "class-validator";

@InputType()
export class AddCartItemInput {
  @Field(() => ID)
  skuId!: string;

  @Field(() => Int)
  @IsInt()
  quantity!: number;
}

@InputType()
export class RemoveCartItemInput {
  @Field(() => ID)
  skuId!: string;
}

@InputType()
export class UpdateCartItemInput {
  @Field(() => ID)
  skuId!: string;

  @Field(() => Int, { nullable: true })
  @ValidateIf((input: UpdateCartItemInput) => input.quantity !== undefined)
  @IsInt()
  quantity?: number;

  @Field(() => Boolean, { nullable: true })
  @ValidateIf((input: UpdateCartItemInput) => input.isSelected !== undefined)
  @IsBoolean()
  isSelected?: boolean;
}
