import { Module } from "@nestjs/common";
import { OrderModule } from "../../modules/order/order.module";
import { AuthBffModule } from "../auth/auth-bff.module";
import { OrderResolver } from "./order.resolver";
import { AddressModule } from "../../modules/address/address.module";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [OrderModule, AddressModule, AuthBffModule],
  providers: [CheckoutService, OrderResolver],
})
export class OrderBffModule {}
