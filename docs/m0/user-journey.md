# M0 · Core User Journeys

Category: consumer electronics / 3C. Touchpoints: web +
mobile; journeys are identical on both, only the interaction form
differs.

Scope decisions (confirmed):
- Guests can browse and add to cart (cart stored locally); login is
  required only at checkout, after which the local cart merges into the
  server-side cart.
- After-sales (cancel/refund/return) is reserved in the state machine
  and data model but implementation is deferred; the M2 business loop
  ends at "confirm receipt."
- M2 ships simple keyword search (PG full-text/ILIKE); a dedicated
  search engine comes later.

## Target user

A single persona is enough to drive the design: **ordinary consumer**
shopping for electronics (phones/earphones/keyboards), sensitive to
price and specs, compares configurations before ordering, and tracks
shipping after purchase. The operator/admin perspective belongs to the
M3 operations console and is out of scope here.

## Journey overview

```
Discover → product detail / pick specs → add to cart → checkout (login gate)
→ submit order → pay (mock) → await shipment / track logistics (mock) → confirm receipt
                                        ↘ (reserved) cancel / refund / after-sales
```

## Journey A: Discovery & browsing (guest-accessible)

| # | User action | System behavior | Notes / dependencies |
|---|-------------|-----------------|----------------------|
| A1 | Open home page | Show banners, promotion slots, featured product list | Banner/promotion assets come from Strapi (ADR-007); M1 may ship a product list only |
| A2 | Click a category (e.g. "Phones") | Show the category's product list with filters (price range/brand/specs) and sorting | Categories form a tree; filters are driven by attribute templates |
| A3 | Search by keyword | Return matching product list | M2, simple keyword search |
| A4 | Click a product card | Open the product detail page | — |

## Journey B: Product detail & add to cart (guest-accessible)

| # | User action | System behavior | Notes / dependencies |
|---|-------------|-----------------|----------------------|
| B1 | View product detail | Show SPU info: title, price range, editorial content, spec sheet | Editorial content/spec sheet from Strapi, price/stock from the product service, aggregated by the BFF (ADR-007) |
| B2 | Pick specs (color × storage, …) | Resolve to a concrete SKU; show its price and stock status | SPU+SKU model; out-of-stock SKUs greyed out |
| B3 | Add to cart | Guest: write to local storage; logged-in user: write to server-side cart | Default quantity 1, adjustable |
| B4 | View cart | Show line items (SKU level), unit price, subtotal, total; quantity editable, items removable | Prices resolve to current values (simplification: always use latest price) |

## Journey C: Order, payment & fulfillment (core loop, M2)

| # | User action | System behavior | Notes / dependencies |
|---|-------------|-----------------|----------------------|
| C1 | Click "checkout" in cart | Not logged in → redirect to login/registration; on success merge the local cart and return to checkout | Login-gate decision; merge strategy: same SKU quantities add up |
| C2 | Confirm checkout info | Show shipping address (create/select), item list, amount breakdown | Address management is Journey D; promotions enter checkout in M3 |
| C3 | Submit order | Create order (snapshot product info & prices), reserve inventory, redirect to payment | Inventory reservation timing defined in the business flows doc (deliverable ③) |
| C4 | Pay | Mock payment page: user chooses "success / failure / timeout" | The mock payment switch is a tool for exercising every branch, not decoration |
| C5 | Payment succeeds | Order transitions: pending payment → paid → awaiting shipment | State machine defined in deliverable ③ |
| C6 | View order list/detail | Show order status, product snapshot, amounts, tracking number | — |
| C7 | Track logistics | Mock logistics: trace advances on a schedule (picked up → in transit → out for delivery → delivered) | Mock logistics generator, M2 |
| C8 | Confirm receipt | Order status → completed | End of the M2 loop |
| C9 | (Reserved) cancel / request refund | State machine reserves: cancellable while pending payment; refundable when paid but unshipped | Designed now, implemented later |

## Journey D: Account (M2)

| # | User action | System behavior | Notes / dependencies |
|---|-------------|-----------------|----------------------|
| D1 | Register | Email + password (simplified; no phone/verification codes) | Auth approach refined in deliverable ⑤ |
| D2 | Log in | Issue session/token; merge guest cart | — |
| D3 | Manage shipping addresses | CRUD, set default | — |
| D4 | View account center | Entries for orders, addresses, logout | — |

## Journey-to-milestone mapping

- **M1**: only A1 (simplified home) + A2 (list, filters optional) +
  B1 (read-only detail). The goal is an end-to-end path, not features.
- **M2**: A (incl. search), B, C (C1–C8), D in full; C9 reserved, not
  implemented.
- **M3+**: promotions enter checkout, after-sales implementation,
  operations console.
