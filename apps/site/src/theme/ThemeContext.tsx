import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { site } from "../data/site";

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
];
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function initial(): ThemeState {
  const base: ThemeState = {
    preset: site.presets[0]!.id,
    accent: site.accents[0]!.id,
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
    const roles = site.themeVars[`${state.preset}_${state.accent}_${state.mode}`];
    const root = document.documentElement.style;
    for (const name of roleVars) root.setProperty(`--${kebab(name)}`, roles?.[name] ?? "");
    document.documentElement.dataset.mode = state.mode;
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
