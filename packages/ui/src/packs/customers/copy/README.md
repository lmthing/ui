# packs/customers/copy

Pure copy and formatting owned by customers pack components, one file per component.
Use `index.ts` as the folder's door.

- `Agreement.ts`: consent labels and stored signing-date copy.
- `ClientCard.ts`: client summary, contact labels and reading.
- `PaymentStatus.ts`: payment labels, dates, settlement, reading and fallback.
- `Review.ts`: review labels, counts, stars and reading.
- `FollowUpQueue.ts`: local due-date priority and formatted follow-up details.
- `SavedItems.ts`: localized billing rates and stable category groups.
- Tests live in `../tests/copy/<Id>.test.ts`.
- Shared currencies and money formatting stay in `catalog/copy`.

Put new words and grammar in `../lang/en.ts`; helpers here take the app `lang`.
