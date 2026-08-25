import { Module } from "@nestjs/common";
import { UserResolver } from "./user.resolver";
import { UserModule } from "../../modules/user/user.module";
import { AuthModule } from "../../modules/auth/auth.module";

@Module({
  imports: [UserModule, AuthModule],
  providers: [UserResolver],
})
export class UserBffModule {}
