import { Module } from "@nestjs/common";
import { AuthModule } from "../../modules/auth/auth.module";
import { GqlAuthGuard } from "./gql-auth.guard";

@Module({
  imports: [AuthModule],
  providers: [GqlAuthGuard],
  exports: [AuthModule, GqlAuthGuard],
})
export class AuthBffModule {}
