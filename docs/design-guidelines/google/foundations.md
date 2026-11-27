# Foundations: build from roles, not values

Material separates reference tokens (values), system tokens (roles), and component tokens (recipes that assign those roles to parts and states). Changing a theme should not change what the app means or what a component can do. The numbers below are Material references or explicitly marked examples, not props to put on the wire.

## Layout and adaptive grids

The 2026 scaffold separates edge-to-edge **bars**, edge **rails** for navigation or tools, and **panes** that hold work. Within a pane, use alignment rulers: inset bars past system obstructions; align titles and first content; indent repeated labels or secondary details to a second content edge. Bleed a hero image or gallery on purpose, without moving headings or hit targets to the unsafe edge.

| Available window width | Class       | Typical arrangement                                                                                     |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `<600 dp`              | Compact     | One pane; switch list/detail in place of showing both; use a bottom navigation bar if needed.           |
| `600–839 dp`           | Medium      | Usually one pane, optional two if both remain readable; compact-height landscape still needs restraint. |
| `840–1199 dp`          | Expanded    | Two panes where useful; replace compact navigation with rail.                                           |
| `1200–1599 dp`         | Large       | One or two panes, allow more context without stretching prose.                                          |
| `≥1600 dp`             | Extra-large | Up to three panes if they support the job.                                                              |

Use the **available window**, not the device label or physical pixels. Handle splits, rotation, folds, resizable windows, keyboards, and bidirectional layouts. Use logical start/end. Android handles system and hinge insets through its window and layout APIs; web needs container/viewport sizing, logical CSS and safe areas where relevant. Never treat an Android dp-to-CSS comparison as a physical-size guarantee.

The older Material 4/8/12-column grid (16 dp phone margins/gutters, often 24 dp tablet gutters) is a useful starting grid, not a fixed requirement in the adaptive scaffold. At 390 with 16 on each side, 358 remains. Two cards with a 16 gap are 171 each; pick that only if both fit realistic text, controls and scaling. Four fluid guide columns with 16 gaps would each be 77.5; round at the edges during layout, not in independent card recipes. More space may show more columns or a supporting pane; it need not inflate the typography or the tap targets.

### For lmthing

Map the scaffold to `PhoneScreen`'s pinned top/bottom, scroll body and overlay, and use existing archetype recipes before inventing containers. `List`/`FileList` to detail, `Gallery`/`Card` feed, and `Player` plus supporting content are natural test cases. Gap: a measured adaptive host recipe that retains the selected item, scroll, draft and keyboard focus when a pane changes form.

## Spacing and density

The 2026 Material spacing system is built on 8 dp (`space100`). Use padding inside objects, gaps between siblings, and margins between a group and its outside edge. Same objects share insets and gaps, related parts sit closer together, unrelated groups sit farther apart. An example for 390: 8 between an icon and short label, 16 inside a normal content module, 24–32 between sections. Material components may use finer increments; its density guidance describes 4 dp adjustments and 48 dp default touch areas. Do not force every glyph or component dimension onto an 8 dp grid. Tighten repeated whitespace first, never by default below a 48 × 48 interaction box.

### For lmthing

Retain the visual rubric's 4-point scale and minimum 12 inside cards. Use 8/16/24 as rhythm examples inside that scale, not a second system. Use `density` in `List`, `Card`, and dense packs such as data and inventory. Gap: demonstrate large type and separate primary/trailing targets in each density, not just more rows per screenshot.

## Typography

M3 defines five roles, each with large, medium and small. The baseline Compose values below are **size / line height / tracking in sp; weight**. The 2025 expansion adds 15 emphasized counterparts; use those intentionally instead of promoting every label to a larger role. Google Sans Flex can express a brand voice; Roboto remains a practical baseline, and fonts with different metrics need rechecking.

| Role                                           | Large                | Medium              | Small              |
| ---------------------------------------------- | -------------------- | ------------------- | ------------------ |
| Display: short feature statement or hero value | 57 / 64 / −0.25; 400 | 45 / 52 / 0; 400    | 36 / 44 / 0; 400   |
| Headline: major page or section                | 32 / 40 / 0; 400     | 28 / 36 / 0; 400    | 24 / 32 / 0; 400   |
| Title: card, row group, app bar                | 22 / 28 / 0; 400     | 16 / 24 / 0.15; 500 | 14 / 20 / 0.1; 500 |
| Body: reading and supporting details           | 16 / 24 / 0.5; 400   | 14 / 20 / 0.25; 400 | 12 / 16 / 0.4; 400 |
| Label: actions and short annotations           | 14 / 20 / 0.1; 500   | 12 / 16 / 0.5; 500  | 11 / 16 / 0.5; 500 |

On 390, try a 24/32 heading, 16/24 body and 14/20 action. Use large display type for a short focal phrase, not for every title. Preserve readability with sufficient line height and room to wrap. Android sp follows user font settings; on web use scalable units and test both zoom and text resizing. Favor a number role with tabular figures for comparisons, not smaller, tightly tracked labels to fit the digits.

### For lmthing

Map semantics to kit typography and the rubric's three-size limit, not literal Roboto everywhere. `Header`, `Hero`, `Article`, `List`, `Amount`, and reports in money/invest/data need distinct title, reading and numeric treatments. Material's 11 sp label is not a waiver for the rubric's under-12 check; there is room for a full supporting label or a reflowed layout.

## Color and dynamic roles

Dynamic color is a palette generator, not wallpaper color painted directly onto the UI. A source (Android wallpaper, artwork, or a brand seed) yields primary, secondary, tertiary, neutral and neutral-variant tonal palettes. The scheme maps those tones and an error palette to named roles, then resolves light, dark and contrast variants. HCT separates hue, chroma and tone so the generator can preserve relationships as preferences change. Static themes use the same role vocabulary.

| Job                                      | Use the pair or family                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Main action / emphasized selection       | `primary` + `onPrimary`; `primaryContainer` + `onPrimaryContainer` for a fill with less emphasis.                                                                                                                                          |
| Supporting control / selected navigation | `secondary` + `onSecondary` or matching container pair; an M3 navigation pill uses `secondaryContainer` with `onSecondaryContainer` icon.                                                                                                  |
| Contrasting accent                       | `tertiary` or `tertiaryContainer` with its own paired content, not as an arbitrary semantic error or success color.                                                                                                                        |
| Error                                    | `error` / `onError`, or `errorContainer` / `onErrorContainer`; pair with a diagnosis or recovery instruction.                                                                                                                              |
| Background, contained surfaces           | `surface` with `onSurface`; `onSurfaceVariant` for reduced emphasis where contrast holds. Choose `surfaceContainerLowest`, `Low`, default, `High`, `Highest`, or `surfaceDim`/`surfaceBright` for tone relationships.                      |
| Boundaries, inversion, layering          | `outline` for a needed edge, `outlineVariant` for quieter separators; `inverseSurface` + `inverseOnSurface` for transient contrast; `scrim` to subordinate content; fixed role pairs when the accent must keep its tone across light/dark. |

Do not put an `on` role on an unrelated fill or tint text with a container role. Check the _rendered_ pair with state layers, opacity, photos and all contrast settings. Text typically needs 4.5:1 (3:1 for qualifying large text); essential controls and graphics typically need 3:1. Google offers standard, medium and high contrast schemes; those don't excuse locally broken pairs. Android 12+ can supply a system scheme; web needs an explicit source and generated CSS variables or a static fallback. For content-driven color, scope it to the artwork detail, not to navigation on every scroll.

### For lmthing

Keep preset, accent and mode as closed choices. Map semantic roles in `src/catalog/themes` and use kit surfaces in `Button`, `Card`, `Banner`, `Progress`, and chart packs. Gap: audit each `on` pair in context across themes and interacting states; only consider wallpaper or content-based palettes through an explicit host/theme policy. Use text or icons for success and danger independent of accent.

## Shape and elevation

The Compose shape scale: none 0; extra-small 4; small 8; medium 12; large 16; large increased 20; extra-large 28; extra-large increased 32; extra-extra-large 48 dp; full is the pill/circle treatment. Some tokens apply to top, start or end corners only. Examples: 8 dp chips, 12 dp baseline cards, 28 dp top corners of a bottom sheet. Match corner relationships to containment; adjacent connected controls can have a larger outer radius and smaller inner radius. Google also offers 35 decorative and morphable shapes; the shape scale is not a reason to silhouette every card.

Elevation levels 0–5 correspond to **0, 1, 3, 6, 8, 12 dp** in Compose. Elevation communicates where surfaces sit, not just shadow strength. Give raised controls or a modal spatial separation when they need it; use tonal container roles first for resting surfaces and in dark mode. A baseline elevated card is level 1 and a regular FAB level 3; prefer the spec for the element over an arbitrary new shadow. Coordinate visual elevation, paint order, scrim, and blocked input; a stronger CSS shadow is not a working overlay.

### For lmthing

Map `Card`, `List`, `Choice`, `Sheet`, and confirmations to catalog radius/elevation roles and kit surfaces. Use shape to communicate grouping or selected state, not to create a new hit region. Gap: connected and segmented corner recipes should define adjacency and focus behavior at the kit level. Do not equate the stage's camera depth with content elevation inside a phone.

## Iconography and imagery

Use one coherent icon family (Material Symbols offers Outlined, Rounded and Sharp). Start around a 24 dp mark in a 48 dp actionable area; dense in-line non-controls may use a smaller mark. Symbols have fill `0–1`, weight `100–700`, grade `−50–200`, and optical size `20–48`; choose by state and optical balance. Filled versus outline can reinforce selection, not replace semantics. Pair unfamiliar icons with labels; mirror directional arrows for RTL, not universal symbols such as search. Web can subset variable fonts or use SVG, but needs accessible names for the controls and no duplicate icon announcements. Native needs equivalent semantics and may use vector assets instead of a font.

Images should identify the subject, explain an action, or orient the person. Use a repeated ratio (for example 1:1 for comparables, 16:9 for a wide preview), preserve the point of interest after clipping, and reserve the box before loading. Prefer a caption on a stable solid surface over overlaid text; if overlay is necessary, test the composited contrast across crops and states. Put diagrams' essential labels or equivalent data in accessible text. Decorative imagery has no duplicate spoken description. Treat older Material imagery as composition guidance, not current component tokens; Google's Gemini case study shows illustration and motion teaching where an interaction starts, not just embellishing it.

### For lmthing

Use the icon vocabulary and media props, cast and resolvers for `Hero`, `Photo`, `Gallery`, `List` and `MapPins`. Media, places, marketplace and learning benefit from closed, focal-point-aware crop choices. Gap: a common placeholder aspect ratio, crop and alternative-text policy; visual-rubric check for overlay contrast against actual imagery.

Sources: [M3 layout](https://m3.material.io/foundations/layout/layout-overview) · [Grids](https://m3.material.io/foundations/layout/grids-spacing/overview) and [spacing system](https://m3.material.io/styles/spacing/overview) · [Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) · [I/O 2026](https://m3.material.io/blog/whats-new-at-io26) · [Legacy grid](https://m2.material.io/design/layout/responsive-layout-grid.html) · [Type](https://m3.material.io/styles/typography/overview) · [Compose type values](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt) · [Color generation](https://m3.material.io/styles/color/system/how-the-system-works) · [Color roles](https://m3.material.io/styles/color/roles) · [Shape](https://m3.material.io/styles/shape/overview-principles) · [Compose shape values](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ShapeTokens.kt) · [Elevation](https://m3.material.io/styles/elevation/overview) · [Compose elevation values](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ElevationTokens.kt) · [Symbols](https://developers.google.com/fonts/docs/material_symbols) · [Imagery](https://m2.material.io/design/communication/imagery.html) · [Gemini illustration](https://design.google/library/gemini-ai-visual-design).
