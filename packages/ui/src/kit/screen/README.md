# kit/screen

Draws one `ScreenLike`.

Built in step U2. Read plan 5.6 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `Screen.tsx`
- `PhoneScreen.tsx` the one component hosts mount: plain props in (`screen`, `theme`, `packs`, `tabs`, `cast`, callbacks), builds the registry, wraps `KitProvider`, renders `Screen`. No spec or protocol types
- `regions.ts` sort by region
- `rhythm.ts` gap table
- `Morph.tsx` cross-fade while height springs
- `Arrive.tsx` fade in and rise 8 points, 40 ms stagger, max 6 items
- `index.ts`

Rules:
- Top is pinned, the body is one scrolling column with the 20 point gutter, the bottom holds the primary action then the tab bar.
- Key every component by its id. An unknown id renders nothing and reports `unknown_component`.
- The tab bar comes from a host-supplied `tabs` prop. The model never writes it.
- Motion table: plan 5.6. Reduce motion turns everything into cross-fades.
