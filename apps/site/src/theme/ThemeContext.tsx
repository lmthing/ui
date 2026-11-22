import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { accents, presets, themeRoles } from "../../../../packages/ui/src/catalog/themes";

export type Mode = "light" | "dark";
export type ThemeState = { preset: string; accent: string; mode: Mode };
type Value = ThemeState & { set: (next: Partial<ThemeState>) => void };

const key = "lmthing-ui-theme";
const roleVars = [
  "bg",
  "surface",
  "raised",
  "line",
  "text",
  "muted",
  "accent",
  "accentSoft",
  "onAccent",
  "good",
  "warn",
  "bad",
] as const;
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function resolveSiteTheme({ preset, accent, mode }: ThemeState) {
  return {
    preset: presets.find(({ id }) => id === preset) ?? presets[0],
    accent: accents.find(({ id }) => id === accent) ?? accents[0],
    mode: mode === "dark" ? ("dark" as const) : ("light" as const),
  };
}

function initial(): ThemeState {
  const base: ThemeState = {
    preset: presets[0].id,
    accent: accents[0].id,
    mode: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };
  try {
    return { ...base, ...(JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<ThemeState>) };
  } catch {
    return base;
  }
}

const Context = createContext<Value | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const { preset, accent, mode } = resolveSiteTheme(state);
    const roles = themeRoles(preset, accent, mode);
    const root = document.documentElement.style;
    for (const name of roleVars) root.setProperty(`--${kebab(name)}`, roles[name]);
    document.documentElement.dataset.mode = mode;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage can be blocked; the theme still applies */
    }
  }, [state]);
  const value = useMemo(
    () => ({ ...state, set: (next: Partial<ThemeState>) => setState((s) => ({ ...s, ...next })) }),
    [state],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTheme(): Value {
  const value = useContext(Context);
  if (!value) throw new Error("useTheme needs a ThemeProvider");
  return value;
}
