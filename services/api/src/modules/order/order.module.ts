import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { OrderService } from "./order.service";

@Module({
  imports: [PrismaModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
