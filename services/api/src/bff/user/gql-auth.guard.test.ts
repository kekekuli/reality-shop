import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionService } from "../../modules/auth/session.service";
import { ACCESS_KEY } from "./auth-cookie";
import {
  AuthenticatedRequest,
  GqlAuthGuard,
} from "./gql-auth.guard";

vi.mock("../../env", () => ({
  env: {
    NODE_ENV: "test",
  },
}));

function requestWith({
  authorization,
  cookie,
}: {
  authorization?: string;
  cookie?: string;
}): AuthenticatedRequest {
  return {
    get: vi.fn().mockReturnValue(authorization),
    cookies: cookie === undefined ? {} : { [ACCESS_KEY]: cookie },
  } as unknown as AuthenticatedRequest;
}

function executionContextFor(request: AuthenticatedRequest): ExecutionContext {
  vi.spyOn(GqlExecutionContext, "create").mockReturnValue({
    getContext: () => ({ req: request }),
  } as GqlExecutionContext);

  return {} as ExecutionContext;
}

function guardWith(verifyAccessToken: ReturnType<typeof vi.fn>): GqlAuthGuard {
  return new GqlAuthGuard({
    verifyAccessToken,
  } as unknown as SessionService);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GqlAuthGuard", () => {
  it("authenticates a Bearer token and attaches its user id", async () => {
    const request = requestWith({ authorization: "Bearer access-token" });
    const verifyAccessToken = vi.fn().mockResolvedValue(42n);

    await expect(
      guardWith(verifyAccessToken).canActivate(executionContextFor(request)),
    ).resolves.toBe(true);
    expect(verifyAccessToken).toHaveBeenCalledWith("access-token");
    expect(request.auth).toEqual({ userId: 42n });
  });

  it("falls back to the access cookie when the header is absent", async () => {
    const request = requestWith({ cookie: "cookie-token" });
    const verifyAccessToken = vi.fn().mockResolvedValue(42n);

    await guardWith(verifyAccessToken).canActivate(
      executionContextFor(request),
    );

    expect(verifyAccessToken).toHaveBeenCalledWith("cookie-token");
  });

  it("gives an explicit Bearer token priority over the cookie", async () => {
    const request = requestWith({
      authorization: "Bearer bearer-token",
      cookie: "cookie-token",
    });
    const verifyAccessToken = vi.fn().mockResolvedValue(42n);

    await guardWith(verifyAccessToken).canActivate(
      executionContextFor(request),
    );

    expect(verifyAccessToken).toHaveBeenCalledWith("bearer-token");
  });

  it("does not fall back to cookies for a malformed explicit header", async () => {
    const request = requestWith({
      authorization: "Basic credentials",
      cookie: "valid-cookie-token",
    });
    const verifyAccessToken = vi.fn();

    await expect(
      guardWith(verifyAccessToken).canActivate(executionContextFor(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("rejects a request with no token", async () => {
    const request = requestWith({});

    await expect(
      guardWith(vi.fn()).canActivate(executionContextFor(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token that fails verification", async () => {
    const request = requestWith({ authorization: "Bearer invalid-token" });
    const verifyAccessToken = vi.fn().mockResolvedValue(null);

    await expect(
      guardWith(verifyAccessToken).canActivate(executionContextFor(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.auth).toBeUndefined();
  });
});
