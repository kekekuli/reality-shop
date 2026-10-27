import { CombinedGraphQLErrors } from "@apollo/client/errors";
import type { ErrorCode } from "./generated/graphql";

export function hasGraphQLErrorCode(error: unknown, code: string): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (graphQLError) => graphQLError.extensions?.code === code,
    )
  );
}

export function classifyGraphQLRequestError(error: unknown): ErrorCode {
  if (!CombinedGraphQLErrors.is(error)) return "NETWORK";

  return hasGraphQLErrorCode(error, "UNAUTHENTICATED")
    ? "UNAUTHORIZED"
    : "UNEXPECTED";
}

export function requireGraphQLData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error("GraphQL response did not contain data");
  }

  return data;
}
