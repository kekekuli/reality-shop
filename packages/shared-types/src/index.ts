export type Cents = bigint & { __brand: "Cents" }; // always integer, CNY. Never float

// Status vocabularies mirror the CHECK constraints in the migrations
// (data-model.md: text + CHECK, not native enums) — keep both in sync.
export type ProductStatus = "draft" | "on_sale" | "off_shelf";
export type SkuStatus = "on_sale" | "off_shelf";
export type CategoryStatus = "visible" | "hidden";
export type UserStatus = "active" | "disabled";
