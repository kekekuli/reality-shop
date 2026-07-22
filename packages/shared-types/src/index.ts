export type Cents = bigint & { __brand: "Cents" }; // always integer, CNY. Never float

export type ProductStatus = "draft" | "on_sale" | "off_shelf";
export type SkuStatus = "on_sale" | "off_shelf";
export type CategoryStatus = "visible" | "hidden";
