# catalog/themes

A theme is preset plus accent plus mode. 12 x 12 x 2 = 288 generated themes.

Built in step U1. Read plan 4.3 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `presets/` 12 files, `accents.ts` 12 accents
- `theme-name.ts` `themeName({ preset, accent, mode })` gives `kit_<preset>_<mode>_<accent>`
- `kit-style.ts` `KitStyle` and `kitStyleOf(preset)`: radius shift, fonts, density, surface treatment

Rules:
- Plain data. `as const satisfies PresetMeta` / `AccentMeta`.
- A theme's roles are the preset's roles for the mode, with `accent`, `accentSoft`, `onAccent` from the accent.
- Contrast: text on background at least 7:1, muted text and text on accent at least 4.5:1, all 288. Failing ones fail `catalog:check`.
- Colour values are designed in U1 against the reference mock. Placeholders are allowed until then.
