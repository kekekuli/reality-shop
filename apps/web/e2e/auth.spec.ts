import { expect, test } from "@playwright/test";
import { AUTH_COOKIE } from "@reality-shop/shared-types";

const refreshMutation = `
  mutation Refresh {
    refresh {
      data {
        refreshed
      }
      errors {
        code
      }
    }
  }
`;

test("registers, refreshes an expired access token, and logs out", async ({
  context,
  page,
  request,
}) => {
  const unique = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const email = `e2e-${unique}@example.com`;
  const displayName = `E2E ${unique}`;

  await page.goto("/en/register");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("playwright-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(
    page.getByRole("heading", { name: "Your account", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  const issuedCookies = await context.cookies();
  const issuedAccess = issuedCookies.find(
    (cookie) => cookie.name === AUTH_COOKIE.access,
  );
  const issuedRefresh = issuedCookies.find(
    (cookie) => cookie.name === AUTH_COOKIE.refresh,
  );

  expect(issuedAccess).toBeDefined();
  expect(issuedRefresh).toBeDefined();

  await context.clearCookies({ name: AUTH_COOKIE.access });
  await page.goto("/account");

  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByText(email)).toBeVisible();

  const rotatedCookies = await context.cookies();
  const rotatedAccess = rotatedCookies.find(
    (cookie) => cookie.name === AUTH_COOKIE.access,
  );
  const rotatedRefresh = rotatedCookies.find(
    (cookie) => cookie.name === AUTH_COOKIE.refresh,
  );

  expect(rotatedAccess).toBeDefined();
  expect(rotatedRefresh).toBeDefined();
  expect(rotatedRefresh?.value).not.toBe(issuedRefresh?.value);

  const reusedRefreshResponse = await request.post("/graphql", {
    headers: {
      cookie: `${AUTH_COOKIE.refresh}=${issuedRefresh?.value}`,
    },
    data: { query: refreshMutation },
  });
  const reusedRefreshBody: unknown = await reusedRefreshResponse.json();

  expect(reusedRefreshResponse.ok()).toBe(true);
  expect(reusedRefreshBody).toMatchObject({
    data: {
      refresh: {
        data: null,
        errors: [{ code: "INVALID_REFRESH_TOKEN" }],
      },
    },
  });

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/en\/login$/);
  const cookiesAfterLogout = await context.cookies();
  expect(
    cookiesAfterLogout.some((cookie) => cookie.name === AUTH_COOKIE.access),
  ).toBe(false);
  expect(
    cookiesAfterLogout.some((cookie) => cookie.name === AUTH_COOKIE.refresh),
  ).toBe(false);

  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/login$/);
});
