import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
import { NextIntlClientProvider } from "next-intl";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { LoginMutation } from "@/lib/graphql/queries";
import { LoginForm } from "./login-form";

const { replace } = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace }),
}));

const credentials = {
  email: "user@example.com",
  password: "correct-password",
};
const copy = { ...messages.auth, error: messages.error };

function renderLogin(mocks: ReadonlyArray<MockLink.MockedResponse> = []) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new MockLink(mocks),
  });
  const clearStore = vi.fn(client.clearStore.bind(client));
  client.clearStore = clearStore;
  const view = render(
    <NextIntlClientProvider
      locale="en"
      messages={{ auth: messages.auth, error: messages.error }}
    >
      <ApolloProvider client={client}>
        <LoginForm />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );

  return { ...view, clearStore };
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(copy.login.email), credentials.email);
  await user.type(
    screen.getByLabelText(copy.login.password),
    credentials.password,
  );
  await user.click(screen.getByRole("button", { name: copy.login.submit }));
}

function loginMock(result: Record<string, unknown>, delay?: number) {
  return {
    request: {
      query: LoginMutation,
      variables: { input: credentials },
    },
    result: { data: { login: result } },
    delay,
  };
}

describe("LoginForm", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("shows localized field errors for invalid input", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(copy.login.email), "invalid-email");
    await user.click(screen.getByRole("button", { name: copy.login.submit }));

    expect(await screen.findByText(copy.validation.invalidEmail)).toBeVisible();
    expect(screen.getByText(copy.validation.passwordRequired)).toBeVisible();
  });

  it("disables the form while login is pending", async () => {
    const user = userEvent.setup();
    let releaseResponse!: () => void;

    const link = new ApolloLink(
      () =>
        new Observable((observer) => {
          releaseResponse = () => {
            observer.next({
              data: {
                login: {
                  data: {
                    user: {
                      id: "1",
                      email: credentials.email,
                      displayName: "User",
                    },
                  },
                  errors: [],
                },
              },
            });
            observer.complete();
          };
        }),
    );
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    render(
      <NextIntlClientProvider
        locale="en"
        messages={{ auth: messages.auth, error: messages.error }}
      >
        <ApolloProvider client={client}>
          <LoginForm />
        </ApolloProvider>
      </NextIntlClientProvider>,
    );

    await submitCredentials(user);

    expect(
      screen.getByRole("button", { name: copy.login.submitting }),
    ).toBeDisabled();
    expect(screen.getByLabelText(copy.login.email)).toBeDisabled();
    expect(screen.getByLabelText(copy.login.password)).toBeDisabled();

    await act(async () => {
      releaseResponse();
    });

    expect(
      screen.getByRole("button", { name: copy.login.submit }),
    ).toBeEnabled();
  });

  it("shows the same safe message for invalid credentials", async () => {
    const user = userEvent.setup();
    renderLogin([
      loginMock({
        data: null,
        errors: [
          {
            code: "INVALID_CREDENTIALS",
          },
        ],
      }),
    ]);

    await submitCredentials(user);

    expect(
      await screen.findByText(copy.error.INVALID_CREDENTIALS),
    ).toBeVisible();
  });

  it("shows a localized network error", async () => {
    const user = userEvent.setup();
    renderLogin([
      {
        request: {
          query: LoginMutation,
          variables: { input: credentials },
        },
        error: new Error("private network detail"),
      },
    ]);

    await submitCredentials(user);

    expect(await screen.findByText(copy.error.network)).toBeVisible();
    expect(
      screen.queryByText("private network detail"),
    ).not.toBeInTheDocument();
  });

  it("clears the cache before redirecting after successful login", async () => {
    const user = userEvent.setup();
    const { clearStore } = renderLogin([
      loginMock({
        data: {
          user: {
            id: "1",
            email: credentials.email,
            displayName: "User",
          },
        },
        errors: [],
      }),
    ]);

    await submitCredentials(user);

    await waitFor(() => expect(clearStore).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith("/account");
    expect(clearStore.mock.invocationCallOrder[0]).toBeLessThan(
      replace.mock.invocationCallOrder[0],
    );
  });

  it("still redirects when cache clearing fails after login", async () => {
    const user = userEvent.setup();
    const cacheError = new Error("cache failure");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { clearStore } = renderLogin([
      loginMock({
        data: {
          user: {
            id: "1",
            email: credentials.email,
            displayName: "User",
          },
        },
        errors: [],
      }),
    ]);
    clearStore.mockRejectedValueOnce(cacheError);

    await submitCredentials(user);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/account");
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to clear Apollo cache after login",
        cacheError,
      );
    });
  });
});
