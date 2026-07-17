export type Cents = number; // always integer, CNY. Never float

export interface PageArgs {
  page: number; // index start at 1
  pageSize: number;
}
export interface Paginated<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export type ProductStatus = "draft" | "on_sale" | "off_shelf";
export type SkuStatus = "on_sale" | "off_shelf";
export type CategoryStatus = "visible" | "hidden";
