import { Module } from "@nestjs/common";
import { CartModule } from "../../modules/cart/cart.module";
import { AuthBffModule } from "../auth/auth-bff.module";
import { CartResolver } from "./cart.resolver";
import { CartItemResolver } from "./cart-item.resolver";

@Module({
  imports: [CartModule, AuthBffModule],
  providers: [CartResolver, CartItemResolver],
})
export class CartBffModule {}
