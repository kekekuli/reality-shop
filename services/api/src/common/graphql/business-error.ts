import { ObjectType, Field, registerEnumType } from "@nestjs/graphql";
import { ErrorCode } from "../errors/error-code";

registerEnumType(ErrorCode, {
  name: "ErrorCode",
  description: "Cause of an expected failure; clients render `error.<code>`.",
});

@ObjectType()
export class BusinessError {
  @Field(() => ErrorCode)
  code!: ErrorCode;

  @Field(() => String)
  message!: string;
}
