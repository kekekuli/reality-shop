-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "order_no" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "subtotal_cents" BIGINT NOT NULL,
    "shipping_cents" BIGINT NOT NULL DEFAULT 0,
    "total_cents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cny',
    "shipping_receiver_name" TEXT NOT NULL,
    "shipping_phone" TEXT NOT NULL,
    "shipping_province" TEXT NOT NULL,
    "shipping_city" TEXT NOT NULL,
    "shipping_district" TEXT NOT NULL,
    "shipping_detail" TEXT NOT NULL,
    "payment_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "order_id" BIGINT NOT NULL,
    "sku_id" BIGINT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "product_title" TEXT NOT NULL,
    "spec_values" JSONB NOT NULL,
    "unit_price_cents" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_id","sku_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_id_idx" ON "orders"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "order_items_sku_id_idx" ON "order_items"("sku_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
