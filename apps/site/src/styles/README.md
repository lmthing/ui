# src/styles

Plain CSS. Colours come only from CSS variables that `theme/ThemeContext.tsx` sets from the catalog's
theme roles, so there are no colour literals here beyond the pre-JS defaults in `base.css`. Transitions on
those variables are what make a theme switch morph. `prefers-reduced-motion` turns all motion off.
Files: `base.css` (tokens, type, reveal), `parts.css` (buttons, chips, cards, code), `chrome.css` (header, footer), `packs.css`, `landing.css`, `playground.css`, `phone.css`, `try.css`.
