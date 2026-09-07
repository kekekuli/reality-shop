import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@reality-shop/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import proxy from "./proxy";

const { intlMiddleware } = vi.hoisted(() => ({
  intlMiddleware: vi.fn(),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => intlMiddleware,
}));

vi.mock("./env", () => ({
  env: {
    API_URL: "http://api.test",
  },
}));

const accessCookie = `${AUTH_COOKIE.access}=new-access; Path=/; HttpOnly`;
const refreshCookie = `${AUTH_COOKIE.refresh}=new-refresh; Path=/; HttpOnly`;

function request(pathname: string, cookie?: string): NextRequest {
  return new NextRequest(`http://web.test${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function apiResponse({
  refreshed,
  cookies = [],
}: {
  refreshed: boolean | null;
  cookies?: string[];
}): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      data: {
        refresh: {
          data: refreshed === null ? null : { refreshed },
          errors: [],
        },
      },
    }),
    headers: {
      getSetCookie: () => cookies,
    },
  } as unknown as Response;
}

describe("proxy", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    intlMiddleware.mockImplementation((req: NextRequest) =>
      req.nextUrl.pathname === "/account"
        ? NextResponse.redirect(new URL("/en/account", req.url))
        : NextResponse.next(),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rotates cookies on the locale redirect and skips refresh on the next request", async () => {
    fetchMock.mockResolvedValueOnce(
      apiResponse({
        refreshed: true,
        cookies: [accessCookie, refreshCookie],
      }),
    );

    const firstResponse = await proxy(
      request("/account", `${AUTH_COOKIE.refresh}=old-refresh`),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/graphql",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          cookie: `${AUTH_COOKIE.refresh}=old-refresh`,
        }),
      }),
    );
    expect(firstResponse.headers.get("location")).toBe(
      "http://web.test/en/account",
    );
    expect(firstResponse.headers.getSetCookie()).toEqual([
      accessCookie,
      refreshCookie,
    ]);

    fetchMock.mockClear();
    const secondResponse = await proxy(
      request(
        "/en/account",
        `${AUTH_COOKIE.access}=new-access; ${AUTH_COOKIE.refresh}=new-refresh`,
      ),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(secondResponse.status).toBe(200);
    expect(intlMiddleware).toHaveBeenCalledTimes(2);
  });

  it("redirects a localized request to itself after refreshing", async () => {
    fetchMock.mockResolvedValueOnce(
      apiResponse({
        refreshed: true,
        cookies: [accessCookie, refreshCookie],
      }),
    );

    const response = await proxy(
      request("/en/account", `${AUTH_COOKIE.refresh}=old-refresh`),
    );

    expect(response.headers.get("location")).toBe(
      "http://web.test/en/account",
    );
    expect(response.headers.getSetCookie()).toEqual([
      accessCookie,
      refreshCookie,
    ]);
  });

  it("forwards cookie expiration after an invalid refresh", async () => {
    const expiredAccess = `${AUTH_COOKIE.access}=; Max-Age=0; Path=/`;
    const expiredRefresh = `${AUTH_COOKIE.refresh}=; Max-Age=0; Path=/`;
    fetchMock.mockResolvedValueOnce(
      apiResponse({
        refreshed: null,
        cookies: [expiredAccess, expiredRefresh],
      }),
    );

    const response = await proxy(
      request("/en/account", `${AUTH_COOKIE.refresh}=invalid`),
    );

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      expiredAccess,
      expiredRefresh,
    ]);
  });

  it("continues through locale middleware when refresh is unavailable", async () => {
    const error = new Error("API unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(error);

    const response = await proxy(
      request("/account", `${AUTH_COOKIE.refresh}=old-refresh`),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://web.test/en/account",
    );
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to refresh auth session",
      error,
    );
  });
});
