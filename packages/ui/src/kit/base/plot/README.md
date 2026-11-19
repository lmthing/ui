# kit/base/plot

Numeric line plots and normal-range bands. Callers supply labels, values and explicit point targets.
Null readings break line paths. Loading retains plot and target footprints without controls.
Use the `index.ts` door; this layer depends only on text bases and shared kit infrastructure.
All drawing sizes and colours come from existing tokens, theme roles and `useKitStyle()`.
