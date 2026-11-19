import { site } from "../data/site";
import { useTheme } from "../theme/ThemeContext";
import { Segmented } from "./controls/Segmented";

/** The theme for this component's phone: the same enums as the header control, here beside the props. */
export function ThemeBar() {
  const theme = useTheme();
  return (
    <div className="themebar">
      <p className="label">theme</p>
      <div className="vrow">
        <span className="name">preset</span>
        <Segmented
          label="Preset"
          value={theme.preset}
          options={site.presets.map((p) => p.id)}
          onChange={(preset) => theme.set({ preset })}
        />
      </div>
      <div className="vrow">
        <span className="name">accent</span>
        <Segmented
          label="Accent"
          value={theme.accent}
          options={site.accents.map((a) => a.id)}
          onChange={(accent) => theme.set({ accent })}
        />
      </div>
      <div className="vrow">
        <span className="name">mode</span>
        <Segmented
          label="Mode"
          value={theme.mode}
          options={["light", "dark"]}
          onChange={(mode) => theme.set({ mode: mode as "light" | "dark" })}
        />
      </div>
      <div className="vrow planned">
        <span className="name">density</span>
        <Segmented
          label="Density"
          value="comfortable"
          options={["comfortable", "compact"]}
          onChange={() => undefined}
          disabled
        />
        <span className="name">motion</span>
        <Segmented
          label="Motion"
          value="calm"
          options={["calm", "lively"]}
          onChange={() => undefined}
          disabled
        />
      </div>
      <p className="muted">Density and motion join the theme in step U6a.</p>
    </div>
  );
}
