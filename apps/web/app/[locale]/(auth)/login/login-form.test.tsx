import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { MockedProvider } from "@apollo/client/testing/react";
import { NextIntlClientProvider } from "next-intl";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
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
const copy = messages.auth;

function renderLogin(mocks: ComponentProps<typeof MockedProvider>["mocks"] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ auth: messages.auth }}>
      <MockedProvider mocks={mocks}>
        <LoginForm />
      </MockedProvider>
    </NextIntlClientProvider>,
  );
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(copy.login.email), credentials.email);
  await user.type(
    screen.getByLabelText(copy.login.password),
    credentials.password,
  );
  await user.click(
    screen.getByRole("button", { name: copy.login.submit }),
  );
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
  it("shows localized field errors for invalid input", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByLabelText(copy.login.email),
      "invalid-email",
    );
    await user.click(
      screen.getByRole("button", { name: copy.login.submit }),
    );

    expect(
      await screen.findByText(copy.validation.invalidEmail),
    ).toBeVisible();
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
      <NextIntlClientProvider locale="en" messages={{ auth: messages.auth }}>
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
            message: "Server message must not be displayed",
          },
        ],
      }),
    ]);

    await submitCredentials(user);

    expect(
      await screen.findByText(copy.error.INVALID_CREDENTIALS),
    ).toBeVisible();
    expect(
      screen.queryByText("Server message must not be displayed"),
    ).not.toBeInTheDocument();
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

    expect(
      await screen.findByText(copy.error.network),
    ).toBeVisible();
    expect(screen.queryByText("private network detail")).not.toBeInTheDocument();
  });

  it("redirects after successful login", async () => {
    const user = userEvent.setup();
    renderLogin([
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

    expect(replace).toHaveBeenCalledWith("/");
  });
});
