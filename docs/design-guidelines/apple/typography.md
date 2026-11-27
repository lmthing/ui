# Typography and Dynamic Type

Choose type by **role**, then let scale, weight, and spacing reinforce its priority. Set body text for comfortable reading; metadata gets a secondary role, not a very light weight over patterned imagery. Use the same style for equivalent rows. Keep enough line space for wrapped descriptions and scripts with taller marks. Use tabular numerals when quantities change in place or need to align, not for all prose.

Apple's iOS/iPadOS **Large (default)** Dynamic Type reference, in points, is:

| Role          |   Size / leading | Weight at default |
| ------------- | ---------------: | ----------------- |
| Large Title   |          34 / 41 | Regular           |
| Title 1       |          28 / 34 | Regular           |
| Title 2       |          22 / 28 | Regular           |
| Title 3       |          20 / 25 | Regular           |
| Headline      |          17 / 22 | Semibold          |
| Body          |          17 / 22 | Regular           |
| Callout       |          16 / 21 | Regular           |
| Subhead       |          15 / 20 | Regular           |
| Footnote      |          13 / 18 | Regular           |
| Caption 1 / 2 | 12 / 16; 11 / 13 | Regular           |

These are not a mandate to use 11 pt for metadata or to fit every role into one screen. Apple recommends 17 pt as the iOS default and lists 11 pt as the minimum reference. Use the small end very sparingly. Body moves from 17 pt at Large to 53 pt at AX5; the scale is **not uniform across roles**. At a 390-pt viewport, an accessible row often grows from label + value side by side into a stacked label/value with the action below. Preserve the order of importance, not the row height. Wrap before truncating essential information, scale meaningful glyphs with their text, and never squeeze an action's text to fit a fixed height. Make long identifiers copyable if an abbreviated preview is necessary.

Native text styles adopt Dynamic Type; for custom fonts use relative styles or native scaling APIs and scale related metrics when they need to track the text. On web use relative units, support browser text enlargement and page zoom, and test reflow rather than copying the Apple scale table into CSS. Native points, CSS px, and backing pixels are different units. Use New York or a custom face for a deliberate role, not as a replacement for every functional label.

## For lmthing

The catalog currently has five size steps, including body 15/21 and caption 12/16, and the visual rubric limits individual components to three visible sizes. Keep those as distinct system decisions, not claimed equivalents of Apple's defaults. `KitText` and shared layout typography are the place to investigate role-based scaling; exercise `List`, `KeyValue`, `Field`, `Composer`, `Header`, and time/amount-heavy packs in narrow, long-copy, and large-text cases. A static 390px screenshot can't certify Dynamic Type; add host tests that verify type, layout, and targets together.

Sources: [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [SwiftUI: ScaledMetric](https://developer.apple.com/documentation/swiftui/scaledmetric).
