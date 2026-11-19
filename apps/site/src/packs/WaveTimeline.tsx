import { packById, site } from "../data/site";
import { Counter } from "../shared/Counter";

type Column = { wave: number; planned: number; built: number; total: number };

/** Per wave: planned and built components, and the running total of components across waves. */
function columns(): Column[] {
  let total = site.stats.core;
  return site.waves
    .filter((w) => w.wave > 0)
    .map((w) => {
      const packs = w.packs.flatMap((id) => (packById.get(id) ? [packById.get(id)!] : []));
      const planned = packs.reduce((n, p) => n + (p.plannedComponents || p.items.length), 0);
      const built = packs.reduce((n, p) => n + p.items.filter((i) => i.state !== "draft").length, 0);
      total += planned;
      return { wave: w.wave, planned, built, total };
    });
}

/** Build waves from the pack build plan: each bar is a wave's planned size, filled by what is built. */
export function WaveTimeline() {
  const cols = columns();
  const max = Math.max(...cols.map((c) => c.planned));
  const builtAll = cols.reduce((n, c) => n + c.built, 0) + site.stats.core;
  return (
    <div className="growth">
      <p className="growth-total">
        <strong>
          <Counter to={builtAll} />
        </strong>{" "}
        of <Counter to={cols.at(-1)?.total ?? 0} /> components built, core included
      </p>
      <ol className="waves" aria-label="Build waves">
        {cols.map((c) => (
          <li key={c.wave} className={c.built >= c.planned ? "done" : c.built ? "active" : ""}>
            <span className="col" style={{ height: `${Math.max(14, (c.planned / max) * 100)}px` }}>
              <i style={{ height: `${(c.built / c.planned) * 100}%` }} />
            </span>
            <b>Wave {c.wave}</b>
            <span>
              {c.built} of {c.planned} built
            </span>
            <small>total {c.total}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}
