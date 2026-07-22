import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  controllers: [AppController],
  imports: [PrismaModule],
})
export class AppModule {}
