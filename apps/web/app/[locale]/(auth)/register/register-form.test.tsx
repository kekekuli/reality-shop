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
import { RegisterMutation } from "@/lib/graphql/queries";
import { RegisterForm } from "./register-form";

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

const account = {
  displayName: "New User",
  email: "new-user@example.com",
  password: "correct-password",
};
const copy = messages.auth;

function renderRegister(
  mocks: ReadonlyArray<MockLink.MockedResponse> = [],
) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new MockLink(mocks),
  });
  const clearStore = vi.fn(client.clearStore.bind(client));
  client.clearStore = clearStore;
  const view = render(
    <NextIntlClientProvider locale="en" messages={{ auth: messages.auth }}>
      <ApolloProvider client={client}>
        <RegisterForm />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );

  return { ...view, clearStore };
}

async function submitAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(copy.register.displayName),
    account.displayName,
  );
  await user.type(screen.getByLabelText(copy.register.email), account.email);
  await user.type(
    screen.getByLabelText(copy.register.password),
    account.password,
  );
  await user.click(
    screen.getByRole("button", { name: copy.register.submit }),
  );
}

function registerMock(result: Record<string, unknown>) {
  return {
    request: {
      query: RegisterMutation,
      variables: { input: account },
    },
    result: { data: { register: result } },
  };
}

describe("RegisterForm", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("shows localized field errors for invalid input", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(
      screen.getByLabelText(copy.register.email),
      "invalid-email",
    );
    await user.click(
      screen.getByRole("button", { name: copy.register.submit }),
    );

    expect(
      await screen.findByText(copy.validation.displayNameRequired),
    ).toBeVisible();
    expect(screen.getByText(copy.validation.invalidEmail)).toBeVisible();
    expect(screen.getByText(copy.validation.passwordTooShort)).toBeVisible();
  });

  it("disables the form while registration is pending", async () => {
    const user = userEvent.setup();
    let releaseResponse!: () => void;

    const link = new ApolloLink(
      () =>
        new Observable((observer) => {
          releaseResponse = () => {
            observer.next({
              data: {
                register: {
                  data: {
                    user: {
                      id: "1",
                      email: account.email,
                      displayName: account.displayName,
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
      <NextIntlClientProvider locale="en" messages={{ auth: messages.auth }}>
        <ApolloProvider client={client}>
          <RegisterForm />
        </ApolloProvider>
      </NextIntlClientProvider>,
    );

    await submitAccount(user);

    expect(
      screen.getByRole("button", { name: copy.register.submitting }),
    ).toBeDisabled();
    expect(screen.getByLabelText(copy.register.displayName)).toBeDisabled();
    expect(screen.getByLabelText(copy.register.email)).toBeDisabled();
    expect(screen.getByLabelText(copy.register.password)).toBeDisabled();

    await act(async () => {
      releaseResponse();
    });

    expect(
      screen.getByRole("button", { name: copy.register.submit }),
    ).toBeEnabled();
  });

  it("shows a localized email conflict without exposing server text", async () => {
    const user = userEvent.setup();
    renderRegister([
      registerMock({
        data: null,
        errors: [
          {
            code: "EMAIL_ALREADY_TAKEN",
          },
        ],
      }),
    ]);

    await submitAccount(user);

    expect(
      await screen.findByText(copy.error.EMAIL_ALREADY_TAKEN),
    ).toBeVisible();
  });

  it("shows a localized network error", async () => {
    const user = userEvent.setup();
    renderRegister([
      {
        request: {
          query: RegisterMutation,
          variables: { input: account },
        },
        error: new Error("private network detail"),
      },
    ]);

    await submitAccount(user);

    expect(await screen.findByText(copy.error.network)).toBeVisible();
    expect(screen.queryByText("private network detail")).not.toBeInTheDocument();
  });

  it("clears the cache before redirecting after successful registration", async () => {
    const user = userEvent.setup();
    const { clearStore } = renderRegister([
      registerMock({
        data: {
          user: {
            id: "1",
            email: account.email,
            displayName: account.displayName,
          },
        },
        errors: [],
      }),
    ]);

    await submitAccount(user);

    await waitFor(() => expect(clearStore).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith("/account");
    expect(clearStore.mock.invocationCallOrder[0]).toBeLessThan(
      replace.mock.invocationCallOrder[0],
    );
  });

  it("still redirects when cache clearing fails after registration", async () => {
    const user = userEvent.setup();
    const cacheError = new Error("cache failure");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { clearStore } = renderRegister([
      registerMock({
        data: {
          user: {
            id: "1",
            email: account.email,
            displayName: account.displayName,
          },
        },
        errors: [],
      }),
    ]);
    clearStore.mockRejectedValueOnce(cacheError);

    await submitAccount(user);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/account");
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to clear Apollo cache after registration",
        cacheError,
      );
    });
  });
});
