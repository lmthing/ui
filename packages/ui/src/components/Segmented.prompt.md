## Purpose

Switch between two to four views of the same screen.

## Pick

One active view of the same screen, such as today or week. Prefer Segmented over Chips for a one-of-two or one-of-three choice. Not independently combinable filters (Chips) or navigation between screens (TabBar).

## Writer

- If the response is only one Segmented component, output filter:null and view:null on every option. A standalone line cannot refer to sibling ids that aren't being written. Don't invent any ids.
- On a whole screen, choose one binding mode. For separate panels use filter:null. Give each sibling content line an explicit id, and use that id as view.panel with view.match:null. An option with view.panel:null has no results.
- For one shared List use filter:{"list":"list_id","field":"category"}. Tag the rows with their actual category, use view.panel:null on every option, and set view.match to the exact category, or null for All. In either binding mode view.empty is the option's no-results message.