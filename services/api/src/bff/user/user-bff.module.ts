import { Module } from "@nestjs/common";
import { UserResolver } from "./user.resolver";
import { UserModule } from "../../modules/user/user.module";
import { AuthModule } from "../../modules/auth/auth.module";
import { GqlAuthGuard } from "./gql-auth.guard";

@Module({
  imports: [UserModule, AuthModule],
  providers: [UserResolver, GqlAuthGuard],
})
export class UserBffModule {}
