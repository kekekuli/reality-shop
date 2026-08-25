import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, MinLength, MaxLength } from "class-validator";

@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @MinLength(8)
  @MaxLength(32)
  password!: string;

  @Field(() => String)
  @MinLength(1)
  displayName!: string;
}

@InputType()
export class LoginInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @MinLength(8)
  @MaxLength(32)
  password!: string;
}
