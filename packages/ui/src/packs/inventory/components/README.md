# packs/inventory/components

Component files of the `inventory` pack.

Built in step U3 (drafts), then U7. Read `docs/catalog/packs/inventory.md`, plan 4.2 and 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Things.tsx`
- `Storage.tsx`
- `Loans.tsx`
- `Warranties.tsx`
- `Wishlist.tsx`
- `Listing.tsx`
- `Request.tsx`
- `Lease.tsx`

Rules:
- Same file shape as `src/components/`: exports `meta`, `props`, `fallback`, `examples`, `probes`, view.
- Draft files (`status: "draft"`) have no view yet.
