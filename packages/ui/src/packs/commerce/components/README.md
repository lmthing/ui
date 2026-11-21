# packs/commerce/components

Component files of the `commerce` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/commerce.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Product.tsx`
- `ProductGrid.tsx`
- `VariantPicker.tsx`
- `Cart.tsx`
- `CartBar.tsx`
- `Checkout.tsx`
- `OrderSummary.tsx`
- `OrderStatus.tsx`
- `Promo.tsx`
- `SizeGuide.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
