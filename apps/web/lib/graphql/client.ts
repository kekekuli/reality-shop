import "server-only";

import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import { headers } from "next/headers";
import { env } from "@/env";

type GraphQLErrorPayload = {
  message: string;
  extensions?: {
    code?: string;
  };
};

export class GraphQLRequestError extends Error {
  constructor(readonly errors: readonly GraphQLErrorPayload[]) {
    super(errors[0]?.message ?? "GraphQL request failed");
    this.name = "GraphQLRequestError";
  }

  hasCode(code: string): boolean {
    return this.errors.some((error) => error.extensions?.code === code);
  }
}

export async function gqlFetch<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables,
): Promise<TResult> {
  const query = print(document);
  const cookie = (await headers()).get("cookie");

  const requestHeaders = new Headers({
    "Content-Type": "application/json",
  });

  if (cookie) {
    requestHeaders.set("Cookie", cookie);
  }

  const res = await fetch(`${env.API_URL}/graphql`, {
    method: "POST",
    headers: requestHeaders,
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Graphql request failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: TResult;
    errors?: GraphQLErrorPayload[];
  };

  if (json.errors?.length) {
    throw new GraphQLRequestError(json.errors);
  }

  if (!json.data) {
    throw new Error("GraphQL response did not contain data");
  }

  return json.data;
}
