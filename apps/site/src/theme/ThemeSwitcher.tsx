import { site } from "../data/site";
import { useTheme } from "./ThemeContext";

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Preset, accent and mode: the three enums that make a theme. They restyle this page and every phone on it. */
export function ThemeSwitcher() {
  const theme = useTheme();
  return (
    <div className="theme-switcher">
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
    </div>
  );
}
