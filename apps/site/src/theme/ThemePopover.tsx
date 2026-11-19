import { useEffect, useId, useRef, useState } from "react";
import { site } from "../data/site";
import { useTheme } from "./ThemeContext";

type ChoiceProps = { label: string; value: string; options: string[]; onChange: (v: string) => void };

function Choice({ label, value, options, onChange }: ChoiceProps) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option} className={option === value ? "on" : ""}>
          <input type="radio" name={label} checked={option === value} onChange={() => onChange(option)} />
          {option}
        </label>
      ))}
    </fieldset>
  );
}

/** One compact control for the three theme enums. It restyles this page and every phone on it. */
export function ThemePopover() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node))
        setOpen(false);
    };
    addEventListener("keydown", close);
    addEventListener("pointerdown", close);
    addEventListener("hashchange", () => setOpen(false), { once: true });
    return () => (removeEventListener("keydown", close), removeEventListener("pointerdown", close));
  }, [open]);
  return (
    <div className="theme-pop" ref={root}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <i className="swatch" aria-hidden="true" />
        Theme: {theme.preset}, {theme.accent}, {theme.mode}
      </button>
      {open && (
        <div id={id} role="group" aria-label="Theme" className="pop">
          <Choice
            label="Preset"
            value={theme.preset}
            options={site.presets.map((p) => p.id)}
            onChange={(preset) => theme.set({ preset })}
          />
          <Choice
            label="Accent"
            value={theme.accent}
            options={site.accents.map((a) => a.id)}
            onChange={(accent) => theme.set({ accent })}
          />
          <Choice
            label="Mode"
            value={theme.mode}
            options={["light", "dark"]}
            onChange={(mode) => theme.set({ mode: mode as "light" | "dark" })}
          />
          <p>Density and motion join these as enums in step U6a.</p>
        </div>
      )}
    </div>
  );
}
