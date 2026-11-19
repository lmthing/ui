# Site design note

## Concept: the catalog as a specimen book

A type foundry shows a typeface as numbered specimens. This site shows a component catalog the same way:
every component is a numbered specimen (No. 07 Amount), drawn live on a real phone, with the wire line a
model writes set beside it in mono. The JSON line is the site's one motif, the way the glyph is for a
foundry. Only real lines appear: pack examples, catalog examples and recorded model output. Nothing is
decorative fake code.

The page is ruled, not carded: hairlines, a strict 12-column grid, small mono captions, generous white
space, square corners. Colour is the Moss preset's own roles (paper, ink, one green accent), so the page
changes with the theme control exactly as the phones do.

## Type
- Display: Bricolage Grotesque (variable, optical size). Headings only, tight and a little odd.
- Text: Instrument Sans. Mono: IBM Plex Mono for lines, addresses and captions.
- All three from Google Fonts with system fallbacks; no other web fonts on the page (phones use the kit's).

## Palette
Taken from the catalog at build time (`themeRoles`): bg, surface, text, muted, line, accent. Light is
paper, dark is the Calm dark roles. One accent (Moss) for links, markers and the live part highlight.

## Logo
Mark: a phone outline whose inside is three stacked part-rectangles, the address registry. The middle one
is the accent and is the part that "folds in" last. Wordmark: lowercase monoline letters drawn as paths
(not font text), the dot of the i in the accent, then a slanted address slash and `ui`. Assets:
favicon.svg, an apple-touch PNG and a 1200x630 OG image rendered at build time.
Load animation: the three parts snap in one after the other, like ops folding in; off for reduced motion.

## Home outline (about 7,000 px at 1280)
1. Header: mark and wordmark, five links (Try, Packs, Components, Gallery, GitHub), one theme popover.
2. Hero: a plain statement, two actions, and a live stream: JSON lines on the left, the phone on the
   right. Hover a key to light its part, hover a part to light its key. Fixed heights, so nothing shifts.
3. How a screen gets made: one pipeline diagram (Listener, Director, Writers, Validator, Critic) animated
   by a recorded model's lines going through the real validator.
4. Try it: a model in your browser (three tiers), and the recorded read-and-act demo as a second tab.
5. Packs: waves as a table with status dots, a shelf of the live packs.
6. Components: eight specimens and a link to the full index (own route, #/components).
7. Themes, footer.

## Copy
Short, plain, specific, like a README. Numbers only where they inform. No slogan pairs, no marketing
words. British spelling (colour), as in the repo.
