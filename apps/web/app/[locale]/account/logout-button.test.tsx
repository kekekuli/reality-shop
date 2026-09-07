import { ApolloClient, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
import { NextIntlClientProvider } from "next-intl";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { LogoutMutation } from "@/lib/graphql/queries";
import { LogoutButton } from "./logout-button";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function createClient(result?: Record<string, unknown>, error?: Error) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new MockLink([
      {
        request: { query: LogoutMutation },
        ...(error ? { error } : { result: { data: { logout: result } } }),
      },
    ]),
  });

  return { client, clearStore: vi.spyOn(client, "clearStore") };
}

function renderLogout(client: ApolloClient) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{
        account: messages.account,
        auth: { error: messages.auth.error },
      }}
    >
      <ApolloProvider client={client}>
        <LogoutButton />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );
}

describe("LogoutButton", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("clears the cache and redirects after successful logout", async () => {
    const user = userEvent.setup();
    const { client, clearStore } = createClient({
      data: { loggedOut: true },
      errors: [],
    });
    renderLogout(client);

    await user.click(
      screen.getByRole("button", { name: messages.account.logout }),
    );

    await waitFor(() => expect(clearStore).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("does not clear or redirect after an unexpected response", async () => {
    const user = userEvent.setup();
    const { client, clearStore } = createClient({ data: null, errors: [] });
    renderLogout(client);

    await user.click(
      screen.getByRole("button", { name: messages.account.logout }),
    );

    expect(
      await screen.findByText(messages.auth.error.unexpected),
    ).toBeVisible();
    expect(clearStore).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a network error without clearing or redirecting", async () => {
    const user = userEvent.setup();
    const { client, clearStore } = createClient(
      undefined,
      new Error("private network detail"),
    );
    renderLogout(client);

    await user.click(
      screen.getByRole("button", { name: messages.account.logout }),
    );

    expect(await screen.findByText(messages.auth.error.network)).toBeVisible();
    expect(screen.queryByText("private network detail")).not.toBeInTheDocument();
    expect(clearStore).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("still redirects when cache clearing fails after logout", async () => {
    const user = userEvent.setup();
    const cacheError = new Error("cache failure");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, clearStore } = createClient({
      data: { loggedOut: true },
      errors: [],
    });
    clearStore.mockRejectedValueOnce(cacheError);
    renderLogout(client);

    await user.click(
      screen.getByRole("button", { name: messages.account.logout }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to clear Apollo cache after logout",
      cacheError,
    );

  });
});
