# kit/tamagui

Pieces the host merges into its own Tamagui config.

Built in step U2. Read plan 5.2 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `tokens.ts` `kitTokens`
- `fonts.ts` `kitFonts`, `kitFontAssets`
- `animations.ts` `kitSprings` as plain configs
- `themes.generated.ts` 288 generated themes, committed
- `theme-name.ts` re-export of `themeName`
- `index.ts` exports `kitTokens`, `kitThemes`, `kitFonts`, `kitSprings`, `kitFontAssets`

Rules:
- `themes.generated.ts` is written by `scripts/build-themes.ts`. Never edit it. CI fails if it is stale (`pnpm kit:themes --check`).
- Themes hold colour roles only. Everything else goes through `KitStyle`.
- `--compact` emits 24 themes (preset by mode) with accents as overrides. Same API.
- Fonts: Inter, Source Sans 3, Nunito, Fraunces with Source Serif 4, Barlow Condensed (proposals, OFL).
