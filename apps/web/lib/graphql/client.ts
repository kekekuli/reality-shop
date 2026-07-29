import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import { env } from "@/env";

export async function gqlFetch<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables,
): Promise<TResult> {
  const query = print(document);

  const res = await fetch(`${env.API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Graphql request failed: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data as TResult;
}
