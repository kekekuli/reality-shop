import { ObjectType, ID, Field } from "@nestjs/graphql";
import { Paginated } from "../../common/graphql/connection";

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

@ObjectType()
export class ProductConnection extends Paginated(Product) {}
