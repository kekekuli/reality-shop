import {
  Field,
  ID,
  InputType,
  OmitType,
  PartialType,
} from "@nestjs/graphql";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

@InputType()
export class CreateAddressInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  receiverName!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  province!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  city!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  district!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  detail!: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@InputType()
export class UpdateAddressInput extends PartialType(
  OmitType(CreateAddressInput, ["isDefault"] as const),
) {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  addressId!: string;
}

@InputType()
export class SetDefaultAddressInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  addressId!: string;
}

@InputType()
export class DeleteAddressInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  addressId!: string;
}
