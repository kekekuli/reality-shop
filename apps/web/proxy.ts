import createMiddleware from "next-intl/middleware";
import { print, type ExecutionResult } from "graphql";
import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { routing } from "./i18n/routing";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";
import { RefreshMutation } from "@/lib/graphql/queries";
import type { RefreshMutation as RefreshMutationResult } from "@/lib/graphql/generated/graphql";

const intlMiddleware = createMiddleware(routing);

function isRedirect(response: NextResponse): boolean {
  return (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.has("location")
  );
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

export default async function proxy(req: NextRequest) {
  const intlResponse = intlMiddleware(req);
  const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value;
  const refreshToken = req.cookies.get(AUTH_COOKIE.refresh)?.value;

  if (!accessToken && refreshToken) {
    try {
      const response = await fetch(`${env.API_URL}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") ?? "",
        },
        cache: "no-store",
        body: JSON.stringify({
          query: print(RefreshMutation),
        }),
      });

      if (!response.ok) return intlResponse;

      const result: ExecutionResult<RefreshMutationResult> =
        await response.json();

      const setCookies = response.headers.getSetCookie();
      const refreshed = result.data?.refresh.data?.refreshed === true;

      const nextResponse =
        refreshed && setCookies.length > 0
          ? isRedirect(intlResponse)
            ? intlResponse
            : NextResponse.redirect(req.nextUrl)
          : intlResponse;

      // Always respect Set-Cookie, including expiration after invalid refresh.
      for (const cookie of setCookies) {
        nextResponse.headers.append("set-cookie", cookie);
      }

      return nextResponse;
    } catch (error) {
      console.error("Failed to refresh auth session", error);
    }
  }

  return intlResponse;
}
