# packs/commerce

Pack `commerce`: Selling things for money: a shop, a bakery, a stall.

Built in step U7 (drafts in U3), wave 3 of the catalog plan. Read `docs/catalog/packs/commerce.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `Product.tsx` `ProductGrid.tsx` `VariantPicker.tsx` `Cart.tsx` `CartBar.tsx` `Checkout.tsx` `OrderSummary.tsx` `OrderStatus.tsx` `Promo.tsx` `SizeGuide.tsx` `SavedList.tsx`
- `archetypes/`: `shop.ts` `product.ts` `cart.ts` `checkout.ts` `orders.ts` `product-edit.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
