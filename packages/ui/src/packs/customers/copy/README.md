# packs/customers/copy

Pure copy and formatting owned by customers pack components, one file per component.
Use `index.ts` as the folder's door.

- `Agreement.ts`: consent labels and stored signing-date copy.
- `ClientCard.ts`: client summary, contact labels and reading.
- `PaymentStatus.ts`: payment labels, dates, settlement, reading and fallback.
- `Review.ts`: review labels, counts, stars and reading.
- Tests live in `../tests/copy/<Id>.test.ts`.
- Shared currencies and money formatting stay in `catalog/copy`.
