## Purpose

Choose an available size, colour or other option for one product.

## Pick

Select the variant of one product, with optional price differences and disabled unavailable options. Not choosing a plan (Choice) or filtering a product list (Chips).

## Writer

- For hide-price-only requests the shared fields must be {"detail":"brief","density":null,"surface":null}. Swatches and stock status never imply outlined or compact; only an explicit finish request sets a finish field.
- Use zero-based at pointing to an available option, or omit it if unselected. Only swatch style takes a swatch on every option.
- Keep supplied price differences in extra even when hidden. Use null for unrequested variant fields, never explicit defaults.
- For complexion shades set style "shade": each option has depth (fair, light, medium, deep), undertone (cool, neutral, warm), and "swatch":null. For colour swatches set style "swatch" and write "depth":null,"undertone":null on every option.
