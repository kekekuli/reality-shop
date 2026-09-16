import { beforeEach, describe, expect, it } from "vitest";
import {
  ADDRESS_DRAFT_TTL_MS,
  addressDraftKey,
  clearAllAddressDrafts,
  readAddressDraft,
  writeAddressDraft,
} from "./address-draft";

const values = {
  receiverName: "Ada Lovelace",
  phone: "+44 20 1234 5678",
  province: "Greater London",
  city: "London",
  district: "Westminster",
  detail: "10 Example Street",
  isDefault: true,
};

describe("address drafts", () => {
  beforeEach(() => sessionStorage.clear());

  it("stores an explicit expiration time and reads a current draft", () => {
    const key = addressDraftKey("user-1", "address-1");
    const now = 1_000;

    writeAddressDraft(sessionStorage, key, values, now);

    expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual({
      expiresAt: now + ADDRESS_DRAFT_TTL_MS,
      values,
    });
    expect(readAddressDraft(sessionStorage, key, now)).toEqual(values);
  });

  it("removes an expired draft", () => {
    const key = addressDraftKey("user-1", "address-1");
    const now = 1_000;
    writeAddressDraft(sessionStorage, key, values, now);

    expect(
      readAddressDraft(sessionStorage, key, now + ADDRESS_DRAFT_TTL_MS),
    ).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("removes a malformed draft", () => {
    const key = addressDraftKey("user-1");
    sessionStorage.setItem(key, JSON.stringify({ expiresAt: "later" }));

    expect(readAddressDraft(sessionStorage, key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("clears only address drafts", () => {
    sessionStorage.setItem(addressDraftKey("user-1"), "draft");
    sessionStorage.setItem(addressDraftKey("user-2", "address-2"), "draft");
    sessionStorage.setItem("unrelated", "keep");

    clearAllAddressDrafts(sessionStorage);

    expect(sessionStorage.getItem(addressDraftKey("user-1"))).toBeNull();
    expect(
      sessionStorage.getItem(addressDraftKey("user-2", "address-2")),
    ).toBeNull();
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
  });
});
