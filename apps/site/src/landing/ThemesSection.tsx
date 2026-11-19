import { lazyChunk } from "../shared/lazyChunk";
import { Lazy } from "../shared/Lazy";
import { SectionLabel } from "../shared/SectionLabel";
import { Reveal } from "../shared/Reveal";
import { site } from "../data/site";

const ThemeShowcase = lazyChunk(() => import("./ThemeShowcase"));

export function ThemesSection() {
  const s = site.stats;
  return (
    <section className="sec" id="themes" aria-labelledby="themes-h">
      <SectionLabel n="06" name="Themes" note={`${s.themesBuilt} built; 288 planned.`} />
      <Reveal>
        <h2 id="themes-h">Themes</h2>
        <p className="lede">
          A theme is a preset, an accent and a mode; a line never carries a colour. {s.presetsBuilt} presets
          and {s.accentsBuilt} accents are built ({s.themesBuilt} themes with light and dark); 12 of each are
          planned, with density and motion as two more enums in step U6a. Use the Theme control in the header
          to restyle this page and every phone on it.
        </p>
        <Lazy view={ThemeShowcase} />
      </Reveal>
    </section>
  );
}
