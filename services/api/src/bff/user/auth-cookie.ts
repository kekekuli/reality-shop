import type { CookieOptions, Response } from "express";
import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { env } from "../../env";
import type { TokenPair } from "../../modules/auth/session.service";

const commonOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
} satisfies CookieOptions;
export function setAuthCookies(res: Response, pair: TokenPair): void {
  res.cookie(AUTH_COOKIE.access, pair.accessToken, {
    ...commonOptions,
    expires: pair.accessTokenExpiresAt,
  });

  res.cookie(AUTH_COOKIE.refresh, pair.refreshToken, {
    ...commonOptions,
    expires: pair.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(AUTH_COOKIE.access, commonOptions);
  res.clearCookie(AUTH_COOKIE.refresh, commonOptions);
}
