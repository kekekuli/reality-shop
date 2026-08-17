import { BusinessError } from "./business-error";
import { ObjectType, Field } from "@nestjs/graphql";
import { Type } from "@nestjs/common";

export function MutationPayload<T>(dataRef: Type<T>) {
  @ObjectType({ isAbstract: true })
  abstract class MutationPayloadType {
    @Field(() => dataRef, { nullable: true })
    data?: T;
    @Field(() => [BusinessError])
    errors!: BusinessError[];
  }
  return MutationPayloadType;
}
