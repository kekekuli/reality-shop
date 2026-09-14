import { Field, ID, ObjectType } from "@nestjs/graphql";
import { MutationPayload } from "../../common/graphql/mutation-payload";

@ObjectType()
export class AddressType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  receiverName!: string;

  @Field(() => String)
  phone!: string;

  @Field(() => String)
  province!: string;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  district!: string;

  @Field(() => String)
  detail!: string;

  @Field(() => Boolean)
  isDefault!: boolean;
}

@ObjectType()
export class CreateAddressPayload extends MutationPayload(AddressType) {}

@ObjectType()
export class UpdateAddressPayload extends MutationPayload(AddressType) {}

@ObjectType()
export class SetDefaultAddressPayload extends MutationPayload(AddressType) {}

@ObjectType()
export class DeleteAddressPayload extends MutationPayload(AddressType) {}
