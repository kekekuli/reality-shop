import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { SessionService } from "./session.service";
import { RedisService } from "../../redis/redis.service";
import { JwtService } from "@nestjs/jwt";

vi.mock("../../env", () => ({
  env: {
    ACCESS_TOKEN_TTL: 900,
    REFRESH_TOKEN_TTL: 2_592_000,
    REDIS_URL: "redis://unused-in-unit-tests",
  },
}));

function storedRefresh(userId: string, secret: string): string {
  return JSON.stringify({
    userId,
    secretHash: createHash("sha256").update(secret).digest("base64url"),
  });
}

describe("SessionService.rotateRefreshToken", () => {
  it("does not consume a record when the supplied secret is invalid", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(storedRefresh("42", "valid-secret")),
      getDel: vi.fn(),
    };
    const service = new SessionService(
      redis as unknown as RedisService,
      {} as JwtService,
    );

    await expect(service.rotateRefreshToken("token-id.wrong-secret")).resolves.toBeNull();
    expect(redis.getDel).not.toHaveBeenCalled();
  });

  it("rejects a valid token when another request consumed it first", async () => {
    const value = storedRefresh("42", "valid-secret");
    const redis = {
      get: vi.fn().mockResolvedValue(value),
      getDel: vi.fn().mockResolvedValue(null),
    };
    const service = new SessionService(
      redis as unknown as RedisService,
      {} as JwtService,
    );

    await expect(service.rotateRefreshToken("token-id.valid-secret")).resolves.toBeNull();
    expect(redis.getDel).toHaveBeenCalledWith("auth:refresh:token-id");
  });
});

describe("SessionService.revokeRefreshToken", () => {
  it("consumes a valid refresh token without minting a replacement", async () => {
    const value = storedRefresh("42", "valid-secret");
    const redis = {
      get: vi.fn().mockResolvedValue(value),
      getDel: vi.fn().mockResolvedValue(value),
    };
    const jwt = { signAsync: vi.fn() };
    const service = new SessionService(
      redis as unknown as RedisService,
      jwt as unknown as JwtService,
    );

    await expect(
      service.revokeRefreshToken("token-id.valid-secret"),
    ).resolves.toBeUndefined();
    expect(redis.getDel).toHaveBeenCalledWith("auth:refresh:token-id");
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it("succeeds when the token is already absent", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      getDel: vi.fn(),
    };
    const service = new SessionService(
      redis as unknown as RedisService,
      {} as JwtService,
    );

    await expect(
      service.revokeRefreshToken("token-id.valid-secret"),
    ).resolves.toBeUndefined();
    expect(redis.getDel).not.toHaveBeenCalled();
  });
});
