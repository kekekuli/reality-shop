import { Module } from "@nestjs/common";
import { CartModule } from "../../modules/cart/cart.module";
import { AuthModule } from "../../modules/auth/auth.module";
import { GqlAuthGuard } from "../user/gql-auth.guard";
import { CartResolver } from "./cart.resolver";
import { CartItemResolver } from "./cart-item.resolver";

@Module({
  imports: [CartModule, AuthModule],
  providers: [CartResolver, CartItemResolver, GqlAuthGuard],
})
export class CartBffModule {}
