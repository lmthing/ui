import { lazy } from "react";
import { Lazy } from "../shared/Lazy";
import { packById } from "../data/site";
import { Specimen } from "../index/Specimen";
import { NotFound } from "../shell/NotFound";
import { cap, shotLabel, statusOf } from "../shared/status";

const WorkedExample = lazy(() => import("./WorkedExample"));

/** One pack: status, its worked app in three presets, its components, then what is still planned. */
export default function PackPage({ id }: { id: string }) {
  const pack = packById.get(id);
  if (!pack) return <NotFound what={`pack called ${id}`} />;
  const status = statusOf(pack);
  const planned = pack.planned.filter((p) => !pack.items.some((i) => i.id === p.id));
  return (
    <main id="main" className="wrap page">
      <a href="#packs">&larr; All packs</a>
      <p className="caption">
        <span>
          Pack · wave {pack.wave} · {status}
        </span>
        <span>{shotLabel(pack)}</span>
      </p>
      <h1>{cap(pack.id)}</h1>
      <p className="lede">{pack.pick}</p>
      {pack.example && (
        <p className="pickline">
          <b>Worked example:</b> {pack.example}
        </p>
      )}
      {pack.lines.length > 0 && <Lazy view={WorkedExample} id={pack.id} />}
      <h2>Components</h2>
      <div className="specimens all">
        {pack.items.map((item) => (
          <Specimen key={item.id} item={item} />
        ))}
        {planned.map((p) => (
          <article key={p.id} className="specimen planned">
            <p className="spec-head">
              <span>planned</span>
              <span>
                {pack.id} · {p.group}
              </span>
            </p>
            <h3>{p.id}</h3>
            <span className="purpose">{p.summary}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
