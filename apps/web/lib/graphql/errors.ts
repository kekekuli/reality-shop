import { CombinedGraphQLErrors } from "@apollo/client/errors";

export type GraphQLRequestErrorKey =
  | "UNAUTHENTICATED"
  | "network"
  | "unexpected";

export function hasGraphQLErrorCode(error: unknown, code: string): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (graphQLError) => graphQLError.extensions?.code === code,
    )
  );
}

export function classifyGraphQLRequestError(
  error: unknown,
): GraphQLRequestErrorKey {
  if (!CombinedGraphQLErrors.is(error)) return "network";

  return hasGraphQLErrorCode(error, "UNAUTHENTICATED")
    ? "UNAUTHENTICATED"
    : "unexpected";
}

export function requireGraphQLData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error("GraphQL response did not contain data");
  }

  return data;
}
