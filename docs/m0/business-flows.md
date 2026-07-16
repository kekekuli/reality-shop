# M0 · Core Business Flows

Covers Journey C (order, payment, fulfillment) with branches and
failure paths. Governing decisions: reserve inventory at order
submission + delayed-task timeout cancellation (ADR-009), after-sales
reserved but deferred, mock payment / mock logistics (PRODUCT_PLAN M2).

## 1. Order state machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT: submit order (reserve inventory)
    PENDING_PAYMENT --> PAID: payment success callback
    PENDING_PAYMENT --> CANCELLED: user cancel / timeout (release inventory)
    PAID --> SHIPPED: ship (M2: auto-triggered by mock logistics)
    SHIPPED --> DELIVERED: logistics delivered
    DELIVERED --> COMPLETED: user confirms receipt
    COMPLETED --> [*]
    CANCELLED --> [*]

    %% —— Reserved states, not implemented in M2 (ADR-009 / deferred after-sales) ——
    PAID --> REFUNDING: (reserved) refund request before shipment
    REFUNDING --> REFUNDED: (reserved) refund done (restock)
    REFUNDED --> [*]
```

State reference:

| State | Meaning | Side effects on entry |
|-------|---------|-----------------------|
| PENDING_PAYMENT | Awaiting payment | Reserve inventory; schedule the timeout-cancellation delayed task |
| PAID | Paid / awaiting shipment | Convert reservation to real deduction; record payment transaction; schedule mock-shipment task |
| SHIPPED | Shipped | Create shipment record; start trace advancement |
| DELIVERED | Delivered | Await user confirmation (auto-confirm is a reserved feature, also a delayed task) |
| COMPLETED | Completed | End of the loop |
| CANCELLED | Cancelled | Release reserved inventory |
| REFUNDING / REFUNDED | Reserved | Enum values and data model reserved; logic deferred |

Constraint: every transition must check the precondition state
(optimistic: `UPDATE ... WHERE status = <expected>`), and every
transition is appended to an order-events table for traceability.

## 2. Order submission flow (with inventory reservation)

```mermaid
flowchart TD
    A[Checkout: submit order] --> B{Validate: session / address / non-empty cart}
    B -- fail --> B1[Return error]
    B -- pass --> C[Begin DB transaction]
    C --> D{Per SKU: check & reserve<br/>available ≥ qty?}
    D -- insufficient --> E[Rollback, report out-of-stock SKUs]
    D -- sufficient --> F[available−n, reserved+n]
    F --> G[Create order + order items<br/>snapshot SKU name/specs/unit price]
    G --> H[Remove ordered items from cart]
    H --> I[Commit transaction]
    I --> J[Schedule delayed task: timeout check in 15 min]
    J --> K[Redirect to mock payment page]
```

Key points:
- Inventory check and reservation happen in one transaction with
  row-level atomicity (`SELECT ... FOR UPDATE` or atomic
  `UPDATE ... WHERE available >= n`) to prevent overselling under
  concurrency.
- Order items store **price and product snapshots**; later price/name
  changes never affect existing orders.
- The delayed task is scheduled after the transaction commits; if
  scheduling fails, the fallback mechanism compensates (§5).

## 3. Payment flow (mock payment, with failure/timeout branches)

The mock payment service simulates a real third-party provider's
**asynchronous callback** (rather than a synchronous return), so we
exercise callback idempotency and state validation — problems real
payment integrations must handle.

```mermaid
flowchart TD
    A[Mock payment page] --> B{User picks an outcome}
    B -- success --> C[Mock provider fires async callback]
    B -- failure --> D[Stay on payment page, retry allowed<br/>order remains PENDING_PAYMENT]
    B -- do nothing --> E[Wait for timeout]

    C --> F{Callback handler: order status = PENDING_PAYMENT?}
    F -- yes --> G[Transaction: reserved−n real deduction<br/>status→PAID, record payment transaction]
    G --> H[Schedule mock-shipment delayed task]
    F -- no / duplicate callback --> I[Idempotent: ignore, ack success]

    E --> J[Delayed task fires]
    J --> K{Order status = PENDING_PAYMENT?}
    K -- yes --> L[Transaction: status→CANCELLED<br/>reserved−n, available+n release]
    K -- no --> M[Already paid/cancelled: no-op]
```

Race note: the timeout task and the payment callback can arrive nearly
simultaneously. Both use "precondition status must be PENDING_PAYMENT"
as an atomic condition, so the database guarantees exactly one wins and
the other becomes a no-op. The extreme case "cancellation just landed,
then the callback arrives" is treated as a failed payment; the mock
stage does not handle refunds (a real integration would — already
covered by the reserved states).

## 4. Mock logistics flow

```mermaid
flowchart LR
    A[Order PAID] -- delayed task (e.g. 1 min) --> B[Create shipment<br/>order→SHIPPED]
    B -- delayed task --> C[Trace: picked up]
    C -- delayed task --> D[Trace: in transit]
    D -- delayed task --> E[Trace: out for delivery]
    E -- delayed task --> F[Trace: delivered<br/>order→DELIVERED]
    F -- user action --> G[Confirm receipt<br/>order→COMPLETED]
```

- Every hop is one delayed task (interval configurable; minute-level
  for demos), reusing the same delayed-task facility as timeout
  cancellation.
- Traces are written to a logistics-trace table; the frontend renders a
  timeline.

## 5. Delayed-task reliability fallback

Delayed tasks are a critical dependency of this design (timeout
cancellation, mock shipment, trace advancement, and the reserved
auto-confirm all rely on them), so failure semantics must be explicit:

- All tasks are **idempotent**: on firing, first validate the business
  precondition; if unmet, no-op. Duplicate delivery is therefore
  harmless and at-least-once semantics suffice.
- Component selection (pg-boss / BullMQ) happens in deliverable ⑤;
  requirements: persistence, due-time delivery, retry on failure.
- Fallback: a manually triggered reconciliation script (scans overdue
  PENDING_PAYMENT orders), positioned strictly as an ops tool — the
  regular path never relies on polling (ADR-009).
