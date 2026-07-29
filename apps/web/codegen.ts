import { type CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../../services/api/src/schema.gql",
  documents: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "./lib/graphql/generated/": {
      preset: "client",
      config: {
        scalars: {
          Cents: "string",
        },
      },
    },
  },
};

export default config;
