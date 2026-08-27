import { Field, ObjectType } from "@nestjs/graphql";
import { User } from "./user.type";
import { MutationPayload } from "../../common/graphql/mutation-payload";

// TODO(M2): holds only `user` today; the access token joins it once the
// web/mobile token carriage is settled. Kept as its own type so adding
// that field is additive rather than a breaking change to the payloads.
@ObjectType()
export class AuthType {
  @Field(() => User)
  user!: User;
}

// The two payloads are deliberately identical for now. Sharing one type
// would be shorter, but login is the one likely to grow fields register
// has no use for, and splitting later renames register's return type —
// a breaking change. One extra line buys that freedom.
@ObjectType()
export class RegisterPayload extends MutationPayload(AuthType) {}

@ObjectType()
export class LoginPayload extends MutationPayload(AuthType) {}

@ObjectType()
export class RefreshType {
  @Field(() => Boolean)
  refreshed!: boolean;
}

@ObjectType()
export class RefreshPayload extends MutationPayload(RefreshType) {}

@ObjectType()
export class LogoutType {
  @Field(() => Boolean)
  loggedOut!: boolean;
}
@ObjectType()
export class LogoutPayload extends MutationPayload(LogoutType) {}
