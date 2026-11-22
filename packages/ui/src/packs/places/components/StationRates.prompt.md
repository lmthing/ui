## Purpose

Compare local fuel prices or charging availability and claim station cashback.

## Pick

Live fuel grade prices, EV connector stalls or per-unit cashback for one station. Not static station facts (KeyValue), venue cards (PlaceCard), retail products (ProductGrid) or active charging sessions (ChargePump).

## Writer

- For fuel, write 1–5 grades in display order and no chargers. For EV, write the supplied charger groups and optional per-kWh pricing as grades. Never invent stall counts, prices, distance, or update times.
- Use detail "brief" for only the primary fuel grade or total open stalls at a glance. Keep all supplied grades and chargers in the data.
