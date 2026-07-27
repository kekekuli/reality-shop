import { ObjectType, Field } from "@nestjs/graphql";
import { Type } from "@nestjs/common";

@ObjectType()
export class PageInfo {
  @Field(() => Boolean)
  hasNextPage!: boolean;
  @Field(() => String, { nullable: true })
  endCursor?: string;
}

export function Paginated<T>(classRef: Type<T>) {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType {
    @Field(() => classRef)
    node!: T;
    @Field(() => String)
    cursor!: string;
  }

  @ObjectType({ isAbstract: true })
  abstract class ConnectionType {
    @Field(() => [EdgeType])
    edges!: EdgeType[];
    @Field(() => PageInfo)
    pageInfo!: PageInfo;
  }

  return ConnectionType;
}
