
Order snapshots follow from this (M2, `order_items.title_snapshot`):
they freeze **the copy the user actually saw at checkout** — i.e. the
Strapi translation for their locale at that moment — not
`products.title` and not a multi-locale blob. An order is a receipt: it
should keep reading the way it read when it was placed, even if the
product is later renamed, retranslated or delisted. A user switching
languages afterwards still sees the original order in the original
language, which is the correct behaviour rather than a gap.

This settles `products.title`'s role: it is a **master-data name for
internal identification** (admin lists, logs, debugging), never a
display string. The storefront always renders Strapi content. M1 is a
known temporary exception — with no Strapi yet, the product list renders
`products.title` directly; M2 moves the product detail page and
checkout lines to Strapi, and `title` recedes as M3 finishes the
content side.
