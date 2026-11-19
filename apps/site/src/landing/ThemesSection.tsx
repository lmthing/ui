import { lazy } from "react";
import { Lazy } from "../shared/Lazy";
import { site } from "../data/site";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";

const ThemeShowcase = lazy(() => import("./ThemeShowcase"));

export function ThemesSection() {
  const s = site.stats;
  return (
    <section className="block wrap" id="themes">
      <p className="eyebrow">Themes</p>
      <h2>Enums, one screen, any look</h2>
      <p className="lede">
        {s.presetsBuilt} presets and {s.accentsBuilt} accents are built, in light and dark ({s.themesBuilt}{" "}
        themes). The plan is 12 of each, 288 themes, with density and motion added as two more enums
        (planned). Switch below and the whole page, and every phone on it, restyles.
      </p>
      <ThemeSwitcher />
      <Lazy view={ThemeShowcase} />
    </section>
  );
}
