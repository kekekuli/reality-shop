import { describe, it, expect } from "vitest";
import { Kind } from "graphql";
import { Cents } from "./cents.scalar";

describe("Cents scalar", () => {
  describe("serialize (outbound: bigint -> string)", () => {
    it("serializes a bigint to a string", () => {
      expect(Cents.serialize(199900n)).toBe("199900");
    });

    it("serializes a value above 2^53 to an exact string (the reason we hand-roll it)", () => {
      // graphql-scalars would return a JS number here and lose precision;
      // ours always emits a string, so the wire type never varies by magnitude.
      const big = 90071992547409910n;
      expect(Cents.serialize(big)).toBe("90071992547409910");
    });

    it("throws when given a non-bigint (a server-side bug)", () => {
      expect(() => Cents.serialize(199900)).toThrow();
      expect(() => Cents.serialize("199900")).toThrow();
    });
  });

  describe("parseValue (inbound via variables: string -> bigint)", () => {
    it("parses an integer string to a bigint", () => {
      expect(Cents.parseValue("199900")).toBe(199900n);
    });

    it("throws on a non-string", () => {
      expect(() => Cents.parseValue(199900)).toThrow();
    });

    it("throws on a non-integer string", () => {
      expect(() => Cents.parseValue("19.99")).toThrow();
      expect(() => Cents.parseValue("abc")).toThrow();
      expect(() => Cents.parseValue("")).toThrow();
    });
  });

  describe("parseLiteral (inbound via query literal)", () => {
    it("parses an INT literal", () => {
      expect(Cents.parseLiteral({ kind: Kind.INT, value: "199900" })).toBe(
        199900n,
      );
    });

    it("parses a STRING literal", () => {
      expect(Cents.parseLiteral({ kind: Kind.STRING, value: "199900" })).toBe(
        199900n,
      );
    });

    it("throws on a FLOAT literal", () => {
      expect(() =>
        Cents.parseLiteral({ kind: Kind.FLOAT, value: "19.99" }),
      ).toThrow();
    });
  });
});
