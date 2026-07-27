import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "./cursor";

describe("cursor", () => {
  it("roundtrips a (date, id) pair", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const decoded = decodeCursor(encodeCursor(date, 5n));

    expect(decoded.sortKey.getTime()).toBe(date.getTime());
    expect(decoded.id).toBe(5n);
  });

  it("preserves a large bigint id without precision loss", () => {
    const id = 9007199254740993n; // > Number.MAX_SAFE_INTEGER
    const decoded = decodeCursor(encodeCursor(new Date(0), id));

    expect(decoded.id).toBe(id);
  });

  it("rejects non-base64 garbage", () => {
    expect(() => decodeCursor("!!!not-base64")).toThrow("Invalid cursor");
  });

  it("rejects an empty string", () => {
    expect(() => decodeCursor("")).toThrow("Invalid cursor");
  });

  it("rejects a payload without the separator (wrong segment count)", () => {
    const bad = Buffer.from("12345").toString("base64");
    expect(() => decodeCursor(bad)).toThrow("Invalid cursor");
  });

  it("rejects a payload with too many segments", () => {
    const bad = Buffer.from("123:45:67").toString("base64");
    expect(() => decodeCursor(bad)).toThrow("Invalid cursor");
  });

  it("rejects a non-numeric time segment", () => {
    const bad = Buffer.from("abc:5").toString("base64");
    expect(() => decodeCursor(bad)).toThrow("Invalid cursor");
  });

  it("rejects a non-numeric id segment", () => {
    const bad = Buffer.from("123:xyz").toString("base64");
    expect(() => decodeCursor(bad)).toThrow("Invalid cursor");
  });
});
