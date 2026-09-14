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
import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateAddressMutation } from "@/lib/graphql/queries";
import messages from "@/messages/en.json";
import { AddressForm } from "./address-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const input = {
  receiverName: "Ada Lovelace",
  phone: "+44 20 1234 5678",
  province: "Greater London",
  city: "London",
  district: "Westminster",
  detail: "10 Example Street",
  isDefault: true,
};

const createdAddress = { id: "1", ...input };

function renderForm(link: ApolloLink = new MockLink([])) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link,
  });

  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{ address: messages.address, error: messages.error }}
    >
      <ApolloProvider client={client}>
        <AddressForm />
      </ApolloProvider>
    </NextIntlClientProvider>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(messages.address.receiverName),
    input.receiverName,
  );
  await user.type(screen.getByLabelText(messages.address.phone), input.phone);
  await user.type(
    screen.getByLabelText(messages.address.province),
    input.province,
  );
  await user.type(screen.getByLabelText(messages.address.city), input.city);
  await user.type(
    screen.getByLabelText(messages.address.district),
    input.district,
  );
  await user.type(screen.getByLabelText(messages.address.detail), input.detail);
  await user.click(screen.getByLabelText(messages.address.defaultAddress));
}

function createAddressMock(
  payload: {
    data: typeof createdAddress | null;
    errors: Array<{ code: string }>;
  },
) {
  return {
    request: {
      query: CreateAddressMutation,
      variables: { input },
    },
    result: { data: { createAddress: payload } },
  };
}

describe("AddressForm", () => {
  beforeEach(() => refresh.mockReset());

  it("shows localized validation errors and does not submit empty fields", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    expect(
      await screen.findAllByText(messages.address.validation.required),
    ).toHaveLength(6);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("submits the form, clears it, and refreshes the RSC list", async () => {
    const user = userEvent.setup();
    renderForm(
      new MockLink([
        createAddressMock({ data: createdAddress, errors: [] }),
      ]),
    );

    await fillForm(user);
    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(messages.address.receiverName)).toHaveValue(
      "",
    );
    expect(screen.getByLabelText(messages.address.defaultAddress)).not.toBeChecked();
  });

  it("disables the form and prevents another submit while pending", async () => {
    const user = userEvent.setup();
    let releaseResponse!: () => void;
    let requestCount = 0;
    const link = new ApolloLink(() => {
      requestCount += 1;

      return new Observable((observer) => {
        releaseResponse = () => {
          observer.next({
            data: {
              createAddress: { data: createdAddress, errors: [] },
            },
          });
          observer.complete();
        };
      });
    });
    renderForm(link);

    await fillForm(user);
    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    const pendingButton = screen.getByRole("button", {
      name: messages.address.saving,
    });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByLabelText(messages.address.receiverName)).toBeDisabled();
    expect(screen.getByLabelText(messages.address.defaultAddress)).toBeDisabled();

    await user.click(pendingButton);
    expect(requestCount).toBe(1);

    await act(async () => releaseResponse());
  });

  it("shows an unexpected error for an unsuccessful payload", async () => {
    const user = userEvent.setup();
    renderForm(
      new MockLink([createAddressMock({ data: null, errors: [] })]),
    );

    await fillForm(user);
    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    expect(await screen.findByText(messages.error.unexpected)).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("distinguishes an unauthenticated GraphQL error from a network error", async () => {
    const user = userEvent.setup();
    renderForm(
      new MockLink([
        {
          request: {
            query: CreateAddressMutation,
            variables: { input },
          },
          result: {
            errors: [
              new GraphQLError("Unauthorized", {
                extensions: { code: "UNAUTHENTICATED" },
              }),
            ],
          },
        },
      ]),
    );

    await fillForm(user);
    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    expect(
      await screen.findByText(messages.error.UNAUTHENTICATED),
    ).toBeVisible();
    expect(screen.queryByText(messages.error.network)).not.toBeInTheDocument();
  });

  it("shows a localized network error", async () => {
    const user = userEvent.setup();
    renderForm(
      new MockLink([
        {
          request: {
            query: CreateAddressMutation,
            variables: { input },
          },
          error: new Error("private network detail"),
        },
      ]),
    );

    await fillForm(user);
    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    expect(await screen.findByText(messages.error.network)).toBeVisible();
    expect(
      screen.queryByText("private network detail"),
    ).not.toBeInTheDocument();
  });
});
