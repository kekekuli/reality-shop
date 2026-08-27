import { Module } from "@nestjs/common";
import { RedisModule } from "../../redis/redis.module";
import { JwtModule } from "@nestjs/jwt";
import { env } from "../../env";
import { SessionService } from "./session.service";

@Module({
  imports: [RedisModule, JwtModule.register({ secret: env.JWT_SECRET })],

  providers: [SessionService],
  exports: [SessionService],
})
export class AuthModule {}
