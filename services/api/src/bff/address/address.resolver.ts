import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AddressService } from "../../modules/address/address.service";
import { UseGuards } from "@nestjs/common";
import {
  AddressType,
  CreateAddressPayload,
  DeleteAddressPayload,
  SetDefaultAddressPayload,
  UpdateAddressPayload,
} from "./address.type";
import { AuthenticatedRequest, GqlAuthGuard } from "../auth/gql-auth.guard";
import {
  CreateAddressInput,
  DeleteAddressInput,
  SetDefaultAddressInput,
  UpdateAddressInput,
} from "./address.input";
import { toAddressType } from "./address.mapper";
import { ErrorCode } from "../../common/errors/error-code";

function parseAddressId(value: string): bigint | null {
  try {
    const addressId = BigInt(value);
    return addressId > 0n ? addressId : null;
  } catch {
    return null;
  }
}

@Resolver()
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [AddressType])
  @UseGuards(GqlAuthGuard)
  async addresses(
    @Context("req") request: AuthenticatedRequest,
  ): Promise<AddressType[]> {
    const userId = request.auth!.userId;
    const addresses = await this.addressService.findByUserId(userId);

    return addresses.map(toAddressType);
  }

  @Mutation(() => CreateAddressPayload)
  @UseGuards(GqlAuthGuard)
  async createAddress(
    @Args("input") input: CreateAddressInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<CreateAddressPayload> {
    const userId = request.auth!.userId;
    const address = await this.addressService.create(userId, input);

    return {
      data: toAddressType(address),
      errors: [],
    };
  }

  @Mutation(() => UpdateAddressPayload)
  @UseGuards(GqlAuthGuard)
  async updateAddress(
    @Args("input") input: UpdateAddressInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<UpdateAddressPayload> {
    const addressId = parseAddressId(input.addressId);
    if (addressId === null) {
      return { errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }] };
    }

    const { addressId: _addressId, ...data } = input;
    const result = await this.addressService.update(
      request.auth!.userId,
      addressId,
      data,
    );

    return result.ok
      ? { data: toAddressType(result.address), errors: [] }
      : { errors: [{ code: result.errCode }] };
  }

  @Mutation(() => SetDefaultAddressPayload)
  @UseGuards(GqlAuthGuard)
  async setDefaultAddress(
    @Args("input") input: SetDefaultAddressInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<SetDefaultAddressPayload> {
    const addressId = parseAddressId(input.addressId);
    if (addressId === null) {
      return { errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }] };
    }

    const result = await this.addressService.setDefault(
      request.auth!.userId,
      addressId,
    );

    return result.ok
      ? { data: toAddressType(result.address), errors: [] }
      : { errors: [{ code: result.errCode }] };
  }

  @Mutation(() => DeleteAddressPayload)
  @UseGuards(GqlAuthGuard)
  async deleteAddress(
    @Args("input") input: DeleteAddressInput,
    @Context("req") request: AuthenticatedRequest,
  ): Promise<DeleteAddressPayload> {
    const addressId = parseAddressId(input.addressId);
    if (addressId === null) {
      return { errors: [{ code: ErrorCode.ADDRESS_NOT_FOUND }] };
    }

    const result = await this.addressService.delete(
      request.auth!.userId,
      addressId,
    );

    return result.ok
      ? { data: toAddressType(result.address), errors: [] }
      : { errors: [{ code: result.errCode }] };
  }
}
