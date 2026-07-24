import { GraphQLError } from "graphql";

export function encodeCursor(sortKey: Date, id: bigint): string {
  return Buffer.from(`${sortKey.getTime()}:${id}`).toString("base64");
}

export function decodeCursor(cursor: string): { sortKey: Date; id: bigint } {
  try {
    const parts = Buffer.from(cursor, "base64").toString().split(":");
    if (parts.length !== 2) throw new Error();

    const time = Number(parts[0]);
    if (Number.isNaN(time)) throw new Error();

    return {
      sortKey: new Date(time),
      id: BigInt(parts[1]),
    };
  } catch {
    throw new GraphQLError("Invalid cursor");
  }
}
