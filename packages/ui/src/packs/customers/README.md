# packs/customers

Pack `customers`: People a business serves.

Built in step U5. Read plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `ClientCard.tsx` `ClientList.tsx` `ClientHistory.tsx` `Invoice.tsx` `PaymentStatus.tsx` `Review.tsx`
- `archetypes/`: `clients.ts` `client.ts` `invoice.ts`

Rules:
- Component list is a proposal, finalised in U3. Component ids are PascalCase and equal the file names.
- Tiers: payments and sending to customers are `service`, a customer's view is `people`. Every component needs a `realPath`.
- Each component ships with two examples, renderers in its own file, and an entry in the worked example.
