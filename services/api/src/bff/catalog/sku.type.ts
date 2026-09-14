import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Cents } from "../../common/graphql/cents.scalar";

@ObjectType()
export class Sku {
  @Field(() => String)
  skuCode!: string;

  @Field(() => Cents)
  price!: bigint;

  @Field(() => ID)
  skuId!: string;

  @Field(() => String)
  status!: string;

  productId!: string;
}
