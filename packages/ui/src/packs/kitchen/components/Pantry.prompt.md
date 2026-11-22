## Purpose

Know what food is stored at home and what needs using soon.

## Pick

Food in the cupboard, fridge and freezer with quantities and use-by dates. Not ordinary things to browse (List), things owned generally (Things), or groceries to buy (GroceryList).

## Writer

- Write stored useBy dates, never expiry status, tones or sorted ranks. Dates and today's clock determine those.
- If asked to hide storage locations, set detail to "brief" and keep place in the data. Always write mark null unless the user explicitly asks to highlight a specific item; quantities and expiry dates are not a request to highlight.
- Write openedOn as a date only if supplied. Set lowAt to a numeric stock threshold only if supplied; qty must start with a plain number in the same units. Never write computed low-stock status.
