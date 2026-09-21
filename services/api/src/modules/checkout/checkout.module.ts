import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AddressModule } from "../address/address.module";
import { CartModule } from "../cart/cart.module";
import { OrderModule } from "../order/order.module";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [PrismaModule, AddressModule, CartModule, OrderModule],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
