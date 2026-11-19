import { site } from "../data/site";
import { Counter } from "../shared/Counter";

/** Facts computed from the catalog at build time. */
export function StatsStrip() {
  const s = site.stats;
  const cells: [number, string, string][] = [
    [s.core, "core components", `${s.coreByGroup.map(([g, n]) => `${n} ${g}`).join(", ")}`],
    [s.shipped, "components ready", `${s.built} built or drafted of ${s.plannedTotal} planned`],
    [
      s.packsReady,
      `of ${site.packs.length} packs live`,
      `${s.packsInProgress} in progress, ${s.packsPlanned} planned`,
    ],
    [s.archetypes, "core archetypes", "ready-made screen layouts"],
    [
      s.themesBuilt,
      "themes built",
      `${s.presetsBuilt} presets x ${s.accentsBuilt} accents x 2 modes; 288 planned`,
    ],
  ];
  return (
    <section className="wrap stats" aria-label="The catalog in numbers">
      {cells.map(([n, label, note]) => (
        <div key={label} className="stat card">
          <strong>
            <Counter to={n} />
          </strong>
          <span>{label}</span>
          <small>{note}</small>
        </div>
      ))}
    </section>
  );
}
