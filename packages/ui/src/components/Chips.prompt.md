## Purpose

Narrow a list by toggling visible labels, or pick one value from a few choices.

## Pick

One row of short options to tap directly: toggle several filters independently or choose one value from a longer set. Prefer Segmented for a one-of-two or one-of-three choice. Not search with named filter pickers (FilterBar), switching views (Segmented), ticking off jobs (Checklist) or options that each need a sentence (Choice).

## Writer

- For text-only chips or a request to hide or turn off icons, set "lead":"none", not null. Keep the existing item icon references: lead controls whether they are drawn. Use lead:null for normal chips with no request to hide icons.
- If the response is only one Chips component, use filter:null and view:null on every item. A standalone line cannot refer to sibling ids that aren't being written. Don't invent any ids.
- When composing a list filter, give the sibling List an explicit id and set filter to {"list":"list_id","field":"category"}. Tag each List row with its actual category and set each item's view.match to the exact value. Include view.empty for each item. In filter style use only real categories; no selected chips already means All. In choose style an item without match shows All.
- To show named sibling content instead, set filter:null and give every item a view with panel (the sibling's explicit id), match:null and empty (its no-results message). An item without panel shows its empty message if no other selected item has results.
