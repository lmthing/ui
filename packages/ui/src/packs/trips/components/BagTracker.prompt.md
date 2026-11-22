## Purpose

See where my checked bags were scanned and where to collect them.

## Pick

Track several checked bags by tag across airline scan checkpoints. Not guided steps (Steps), trip packing (PackingList), parcels (DeliveryTracker) or retail orders (OrderStatus).

## Writer

- Use 1–4 distinct bag tags. Give each 1–6 unique scan stages in travel order: checked_in, security, loaded, in_transit, unloaded, carousel. Done means scanned; do not invent timestamps or locations.
- Use detail "brief" only when asked to show each bag’s latest scan and carousel rather than its history. Leave unrequested axes null; never write explicit defaults such as "card" or "comfortable".
