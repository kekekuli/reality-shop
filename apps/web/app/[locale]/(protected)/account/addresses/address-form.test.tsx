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
import {
  CreateAddressMutation,
  UpdateAddressMutation,
} from "@/lib/graphql/queries";
import { addressDraftKey, writeAddressDraft } from "@/lib/address-draft";
import messages from "@/messages/en.json";
import { AddressForm } from "./address-form";

const { refresh, replace } = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
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
const draftKey = addressDraftKey("user-1", "1");

function renderForm(
  link: ApolloLink = new MockLink([]),
  initialAddress?: typeof createdAddress,
) {
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
        <AddressForm draftKey={draftKey} initialAddress={initialAddress} />
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

function updateAddressMock(
  values: typeof input,
  payload: {
    data: typeof createdAddress | null;
    errors: Array<{ code: string }>;
  },
) {
  return {
    request: {
      query: UpdateAddressMutation,
      variables: {
        input: {
          addressId: createdAddress.id,
          receiverName: values.receiverName,
          phone: values.phone,
          province: values.province,
          city: values.city,
          district: values.district,
          detail: values.detail,
          isDefault: values.isDefault,
        },
      },
    },
    result: { data: { updateAddress: payload } },
  };
}

describe("AddressForm", () => {
  beforeEach(() => {
    refresh.mockReset();
    replace.mockReset();
    sessionStorage.clear();
  });

  it("shows localized validation errors and does not submit empty fields", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText(messages.address.createMode)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: messages.address.save }),
    );

    expect(
      await screen.findAllByText(messages.address.validation.required),
    ).toHaveLength(6);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("prefills the shared form for editing", () => {
    renderForm(new MockLink([]), createdAddress);

    expect(
      screen.getByRole("heading", { name: messages.address.editFormTitle }),
    ).toBeVisible();
    expect(screen.getByText(messages.address.editMode)).toBeVisible();
    expect(screen.getByLabelText(messages.address.receiverName)).toHaveValue(
      input.receiverName,
    );
    expect(screen.getByLabelText(messages.address.phone)).toHaveValue(
      input.phone,
    );
    expect(screen.getByLabelText(messages.address.province)).toHaveValue(
      input.province,
    );
    expect(screen.getByLabelText(messages.address.city)).toHaveValue(input.city);
    expect(screen.getByLabelText(messages.address.district)).toHaveValue(
      input.district,
    );
    expect(screen.getByLabelText(messages.address.detail)).toHaveValue(
      input.detail,
    );
    expect(screen.getByLabelText(messages.address.defaultAddress)).toBeChecked();
    expect(
      screen.getByRole("button", { name: messages.address.saveChanges }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: messages.address.cancel }),
    ).toBeEnabled();
  });

  it("allows the current default address to be unchecked", async () => {
    const user = userEvent.setup();
    renderForm(new MockLink([]), createdAddress);

    const defaultAddress = screen.getByLabelText(
      messages.address.defaultAddress,
    );
    await user.click(defaultAddress);

    expect(defaultAddress).not.toBeChecked();
  });

  it("restores a current session draft over the saved address", async () => {
    const draft = {
      ...input,
      receiverName: "Draft recipient",
      detail: "Draft street",
    };
    writeAddressDraft(sessionStorage, draftKey, draft);

    renderForm(new MockLink([]), createdAddress);

    expect(
      await screen.findByDisplayValue(draft.receiverName),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(messages.address.detail)).toHaveValue(
      draft.detail,
    );
  });

  it("clears the draft when the user cancels editing", async () => {
    const user = userEvent.setup();
    renderForm(new MockLink([]), createdAddress);

    await user.clear(screen.getByLabelText(messages.address.receiverName));
    await user.type(
      screen.getByLabelText(messages.address.receiverName),
      "Changed recipient",
    );
    await waitFor(() =>
      expect(sessionStorage.getItem(draftKey)).not.toBeNull(),
    );

    await user.click(
      screen.getByRole("button", { name: messages.address.cancel }),
    );
    expect(replace).toHaveBeenCalledWith("/account/addresses");
    expect(sessionStorage.getItem(draftKey)).toBeNull();
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
    expect(sessionStorage.getItem(draftKey)).toBeNull();
    expect(screen.getByLabelText(messages.address.receiverName)).toHaveValue(
      "",
    );
    expect(
      screen.getByLabelText(messages.address.defaultAddress),
    ).not.toBeChecked();
  });

  it("updates an address, clears its draft, and returns to the list", async () => {
    const user = userEvent.setup();
    const updatedInput = { ...input, receiverName: "Grace Hopper" };
    const updatedAddress = { ...createdAddress, ...updatedInput };
    const nonDefaultAddress = { ...createdAddress, isDefault: false };
    renderForm(
      new MockLink([
        updateAddressMock(updatedInput, {
          data: updatedAddress,
          errors: [],
        }),
      ]),
      nonDefaultAddress,
    );

    const receiverName = screen.getByLabelText(messages.address.receiverName);
    await user.clear(receiverName);
    await user.type(receiverName, updatedInput.receiverName);
    await user.click(screen.getByLabelText(messages.address.defaultAddress));
    await user.click(
      screen.getByRole("button", { name: messages.address.saveChanges }),
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/account/addresses"),
    );
    expect(sessionStorage.getItem(draftKey)).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the address error returned by an update", async () => {
    const user = userEvent.setup();
    renderForm(
      new MockLink([
        updateAddressMock(input, {
          data: null,
          errors: [{ code: "ADDRESS_NOT_FOUND" }],
        }),
      ]),
      createdAddress,
    );

    await user.click(
      screen.getByRole("button", { name: messages.address.saveChanges }),
    );

    expect(
      await screen.findByText(messages.error.ADDRESS_NOT_FOUND),
    ).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
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
    expect(
      screen.getByLabelText(messages.address.defaultAddress),
    ).toBeDisabled();

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
