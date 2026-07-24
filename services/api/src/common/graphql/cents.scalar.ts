import { GraphQLScalarType, Kind, GraphQLError } from "graphql";

export const Cents = new GraphQLScalarType({
  name: "Cents",
  description: "Cents scalar type",
  serialize(value) {
    if (typeof value !== "bigint")
      throw new GraphQLError(
        `Cents can only serialize bigint values, but received ${typeof value}. This is a server-side bug: money must reach the Cents scalar as bigint.`,
      );
    return String(value);
  },
  parseValue(value) {
    if (typeof value !== "string")
      throw new GraphQLError(
        `Cents must be provided as a string, but received ${typeof value}.`,
      );
    return parseCents(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      return parseCents(ast.value);
    }

    throw new GraphQLError(
      `Cents must be an integer, written as a number or a string, but received a ${ast.kind} literal.`,
    );
  },
});

function parseCents(raw: string): bigint {
  if (!/^-?\d+$/.test(raw))
    throw new GraphQLError(
      `Cents must be an integer in the smallest currency unit (e.g. "199900" for ¥1999), but received "${raw}".`,
    );

  return BigInt(raw);
}
