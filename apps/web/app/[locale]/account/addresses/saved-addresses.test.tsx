import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import messages from "@/messages/en.json";
import { SavedAddresses } from "./saved-addresses";

const addresses = [
  {
    id: "1",
    receiverName: "Ada Lovelace",
    phone: "+44 20 1234 5678",
    province: "Greater London",
    city: "London",
    district: "Westminster",
    detail: "10 Example Street",
    isDefault: true,
  },
  {
    id: "2",
    receiverName: "Grace Hopper",
    phone: "+1 212 555 0100",
    province: "New York",
    city: "New York",
    district: "Manhattan",
    detail: "20 Example Avenue",
    isDefault: false,
  },
];

function renderAddresses(items = addresses) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ address: messages.address }}>
      <SavedAddresses addresses={items} />
    </NextIntlClientProvider>,
  );
}

describe("SavedAddresses", () => {
  it("renders the empty state when no address is saved", () => {
    renderAddresses([]);

    expect(screen.getByText(messages.address.emptyTitle)).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders saved addresses and marks only the default one", () => {
    renderAddresses();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText(addresses[0].receiverName)).toBeVisible();
    expect(within(items[0]).getByText(addresses[0].phone)).toBeVisible();
    expect(
      within(items[0]).getByText(
        "Greater London, London, Westminster, 10 Example Street",
      ),
    ).toBeVisible();
    expect(
      within(items[0]).getByText(messages.address.defaultBadge),
    ).toBeVisible();
    expect(
      within(items[1]).queryByText(messages.address.defaultBadge),
    ).not.toBeInTheDocument();
  });
});
