import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";
import { Field, ID, InputType, Int } from "@nestjs/graphql";

@InputType()
export class CreateOrderItemInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  skuId!: string;

  @Field(() => Int)
  @IsInt()
  quantity!: number;
}

@InputType()
export class CreateOrderInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @Field(() => [CreateOrderItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];
}
