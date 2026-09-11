import "server-only";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { headers } from "next/headers";
import { env } from "@/env";
import { createApolloCache } from "./cache";

const forwardRequestCookies: typeof fetch = async (input, init) => {
  const requestHeaders = new Headers(init?.headers);
  const cookie = (await headers()).get("cookie");

  if (cookie) requestHeaders.set("cookie", cookie);

  return fetch(input, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });
};

export const { PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: createApolloCache(),
      link: new HttpLink({
        uri: `${env.API_URL.replace(/\/$/, "")}/graphql`,
        fetch: forwardRequestCookies,
      }),
    }),
);
