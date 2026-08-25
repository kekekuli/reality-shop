import type { CookieOptions, Response } from "express";
import { env } from "../../env";
import type { TokenPair } from "../../modules/auth/session.service";

export const ACCESS_KEY = "access_token";
export const REFRESH_KEY = "refresh_token";

const commonOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
} satisfies CookieOptions;
export function setAuthCookies(res: Response, pair: TokenPair): void {
  res.cookie(ACCESS_KEY, pair.accessToken, {
    ...commonOptions,
    expires: pair.accessTokenExpiresAt,
  });

  res.cookie(REFRESH_KEY, pair.refreshToken, {
    ...commonOptions,
    expires: pair.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_KEY, commonOptions);
  res.clearCookie(REFRESH_KEY, commonOptions);
}
