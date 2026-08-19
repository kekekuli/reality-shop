import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import { JwtService } from "@nestjs/jwt";
import { env } from "../../env";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

@Injectable()
export class SessionService {
  constructor(
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  createAccessToken(userId: bigint): Promise<string> {
    return this.jwt.signAsync(
      { sub: String(userId) },
      { expiresIn: env.ACCESS_TOKEN_TTL },
    );
  }

  async createRefreshToken(userId: bigint): Promise<string> {
    const tokenId = randomBytes(16).toString("base64url");
    const secret = randomBytes(32).toString("base64url");

    const refreshToken = `${tokenId}.${secret}`;

    const secretHash = createHash("sha256").update(secret).digest("base64url");

    const key = `auth:refresh:${tokenId}`;

    const value = JSON.stringify({
      userId: String(userId),
      secretHash,
    });

    await this.redis.set(key, value, env.REFRESH_TOKEN_TTL);

    return refreshToken;
  }

  async createTokenPair(userId: bigint): Promise<TokenPair> {
    const issuedAt = Date.now();
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(userId),
      this.createRefreshToken(userId),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(issuedAt + env.ACCESS_TOKEN_TTL * 1000),
      refreshTokenExpiresAt: new Date(issuedAt + env.REFRESH_TOKEN_TTL * 1000),
    };
  }

  async rotateRefreshToken(refreshToken: string): Promise<TokenPair | null> {
    const session = await this.consumeRefreshToken(refreshToken);
    if (!session) return null;

    return this.createTokenPair(session.userId);
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    // Logout is intentionally idempotent: invalid, expired, and already
    // consumed tokens all end in the same revoked state.
    await this.consumeRefreshToken(refreshToken);
  }

  private async consumeRefreshToken(
    refreshToken: string,
  ): Promise<RefreshSession | null> {
    const parts = refreshToken.split(".");
    if (parts.length !== 2) return null;
    const [tokenId, secret] = parts;
    if (!tokenId || !secret) return null;

    const key = `auth:refresh:${tokenId}`;

    const value = await this.redis.get(key);

    if (!value) return null;

    const { userId, secretHash }: { userId: string; secretHash: string } =
      JSON.parse(value);

    const expectedHash = Buffer.from(secretHash, "base64url");
    const actualHash = createHash("sha256").update(secret).digest();

    if (
      expectedHash.length !== actualHash.length ||
      !timingSafeEqual(expectedHash, actualHash)
    )
      return null;

    // Consume only after proving possession of the secret. GETDEL makes
    // rotation single-use: if two valid refreshes race, only one receives
    // the stored record and is allowed to mint a replacement pair.
    const consumedValue = await this.redis.getDel(key);
    if (consumedValue !== value) return null;

    return { userId: BigInt(userId) };
  }
}

type RefreshSession = {
  userId: bigint;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};
