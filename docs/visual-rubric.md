# Visual rubric

What "finished" means for a component, judged on its `pnpm look` screenshots (3 widths × 3 presets ×
light and dark, every example and state). Every line is checkable by eye. A problem found by a person
that this rubric missed becomes a new line here, or an automated check in `scripts/look-checks.ts`.

Automated checks already cover clipping, overflow, overlap, contrast, faint loading bars, cramped
text, awkward wraps, text under 12px, touch targets, alignment of item parts and item rhythm. The
reviewer judges what they cannot.

## Hierarchy

1. One focal point per component: the eye lands on one thing first (the title, the number, the
   primary action), and it is the thing the component is for.
2. At most three text sizes in one component; secondary text is visibly secondary (size or tone),
   never the same weight and colour as the primary.
3. Numbers that matter use the number role and read at a glance.

## Alignment and spacing

4. Every text in a component starts on one of at most two left edges (content edge, and after a
   leading icon). Icons centre on the first line of their text; a thumbnail taller than a line
   centres on its whole text. A centred layout (Empty, Success, Ring, a centred Profile) instead
   shares one centre axis for all its text and drawing.
5. Spacing follows the 4px scale and repeats: equal things have equal gaps; gaps between groups are
   larger than gaps inside a group.
6. Nothing touches a card or screen edge: at least 12px inside cards, the screen gutter outside.
7. Grids are real grids: columns share edges, cells in a row share a top, column widths are balanced
   for the content (no column squeezed while another has empty space).
8. No large empty areas inside a component that carry nothing.

## Text

9. Text wraps only where a person would expect; short values (names, dates, amounts) never wrap.
10. No line ends with a single short word in titles (widows), where avoidable by limits or layout.

## Colour and surface

11. Accent is used for meaning (primary action, selected, progress), not decoration on everything.
12. Dark mode looks designed: surfaces separate from the background, accents adjusted, nothing that
    was a light tint becomes a muddy block.
13. Each preset keeps its character: `calm` soft and airy, `bold` crisp and high-contrast with strong
    type, `editorial` warm paper with serif headings. The component must look right in all three.

## States

14. Empty reads as a calm, intentional message (icon, line, breathing room), never a cramped box.
15. Loading shows the component's real shape in soft bars, clearly visible, not an empty card.
16. Every example looks like a real app a person would want to use, at 320px as well as 430px.

## Compared with the gold standard

17. Next to `List` at the same width and preset, the component looks like part of the same app:
    same density, radius, type and surface treatment.
