import { Module } from "@nestjs/common";
import { UserResolver } from "./user.resolver";
import { UserModule } from "../../modules/user/user.module";
import { AuthBffModule } from "../auth/auth-bff.module";

@Module({
  imports: [UserModule, AuthBffModule],
  providers: [UserResolver],
})
export class UserBffModule {}
