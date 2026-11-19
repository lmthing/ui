# src/theme

`ThemeContext.tsx` holds the theme as three enums (preset, accent, mode), applies the catalog's colour
roles to the page as CSS variables and remembers the choice. `ThemeSwitcher.tsx` is the control.
Phones read the same state, so one switch restyles the page and every live screen.
