import { Module } from "@nestjs/common";
import { OrderModule } from "../../modules/order/order.module";
import { CheckoutModule } from "../../modules/checkout/checkout.module";
import { AuthBffModule } from "../auth/auth-bff.module";
import { OrderResolver } from "./order.resolver";

@Module({
  imports: [OrderModule, CheckoutModule, AuthBffModule],
  providers: [OrderResolver],
})
export class OrderBffModule {}
