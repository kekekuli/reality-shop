import { ObjectType, ID, Field } from "@nestjs/graphql";

@ObjectType()
export class Product {
  @Field(() => ID)
  id!: string;
  @Field(() => String)
  slug!: string;
  @Field(() => String)
  title!: string;
  @Field(() => String)
  brand!: string;
  @Field(() => String)
  status!: string;
}
