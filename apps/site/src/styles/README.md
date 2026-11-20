# src/styles

Plain CSS. Colours come only from CSS variables that `theme/ThemeContext.tsx` sets from the catalog's theme
roles (the literals in `base.css` are the pre-JS defaults). Transitions on those variables make a theme
switch morph, and `prefers-reduced-motion` turns motion off. Files: `base.css` (tokens, type, sections),
`parts.css`, `states.css` (skeletons, text links), `chrome.css` (header, logo, theme popover), `phone.css`, `home.css`, `packs.css`,
`specimens.css`, `try.css`, `controls.css`, `playground.css`.
