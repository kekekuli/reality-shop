"use client";

import { HttpLink, ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "/graphql",
    credentials: "same-origin",
  }),
  cache: new InMemoryCache(),
});

export default client;
