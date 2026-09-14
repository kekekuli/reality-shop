import { Module } from "@nestjs/common";
import { AddressModule } from "../../modules/address/address.module";
import { AuthBffModule } from "../auth/auth-bff.module";
import { AddressResolver } from "./address.resolver";

@Module({
  imports: [AddressModule, AuthBffModule],
  providers: [AddressResolver],
})
export class AddressBffModule {}
