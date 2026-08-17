import { User } from "./user.type";
import { User as PrismaUser } from "../../generated/prisma/client";

// Pick rather than the whole row: callers select only these columns, and
// passwordHash must never reach a GraphQL type.
export function toUser(
  u: Pick<PrismaUser, "id" | "email" | "displayName">,
): User {
  return {
    id: String(u.id),
    email: u.email,
    displayName: u.displayName,
  };
}
