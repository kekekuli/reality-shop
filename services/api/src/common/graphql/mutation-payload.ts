import { BusinessError } from "./business-error";
import { ObjectType, Field } from "@nestjs/graphql";
import { Type } from "@nestjs/common";

export function MutationPayload<TData, TError = BusinessError>(
  dataRef: Type<TData>,
  errorRef?: Type<TError>,
) {
  const resolvedErrorRef = errorRef ?? BusinessError;

  @ObjectType({ isAbstract: true })
  abstract class MutationPayloadType {
    @Field(() => dataRef, { nullable: true })
    data?: TData;

    @Field(() => [resolvedErrorRef])
    errors!: TError[];
  }

  return MutationPayloadType;
}
