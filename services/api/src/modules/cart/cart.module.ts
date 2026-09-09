import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CartService } from "./cart.service";

@Module({
  providers: [CartService],
  imports: [PrismaModule],
  exports: [CartService],
})
export class CartModule {}
