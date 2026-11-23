## Purpose

See what you own, where it is kept and what needs restocking.

## Pick

Owned or stocked items with editable quantities, storage locations or a per-item low-stock minimum. Not a directory of plain links (List), goods for sale (ProductGrid), food at home (Pantry), or a media library (Library).

## Writer

- Write one entry in items per requested stock record. If the request names just one thing to track, items must contain exactly one entry. Use qty for the number of units in a record; never add duplicate or filler entries to match the example.
- Copy each supplied serial exactly onto the one item it identifies. Never repeat a serial across items or invent one. Only write given conditions.
- qty and min are nonnegative whole counts. A minimum marks low stock. Filter "missing" shows qty zero; use "low" only for low stock, otherwise "all". Always keep all records, even those hidden by the filter.
- For rows without other styling requests, write arrange "rows". Leave arrange null unless a layout is requested.
- For stocktake reconciliation use style "audit", qty for the counted amount and expected for the supplied planned count. Otherwise leave style unset.
- To scan codes, set scan: {"goto":"scan_inventory"} with the requested Camera scan screen id.
