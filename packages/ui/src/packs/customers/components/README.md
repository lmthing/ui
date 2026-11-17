# packs/customers/components

Component files of the `customers` pack.

Built in step U3 (drafts), then U5. Read `docs/catalog/packs/customers.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `ClientCard.tsx`
- `ClientHistory.tsx`
- `Invoice.tsx`
- `PaymentStatus.tsx`
- `Review.tsx`
- `Loyalty.tsx`
- `Agreement.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
