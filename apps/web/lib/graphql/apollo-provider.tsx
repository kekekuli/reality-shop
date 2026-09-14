"use client";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
import { createApolloCache } from "./cache";

function graphqlUri(): string {
  if (typeof window !== "undefined") return "/graphql";

  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error("API_URL is required");

  return `${apiUrl.replace(/\/$/, "")}/graphql`;
}

function makeClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: graphqlUri(),
      credentials: "same-origin",
    }),
    cache: createApolloCache(),
  });
}

export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
