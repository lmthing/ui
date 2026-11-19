import { lazy } from "react";
import { Lazy } from "../shared/Lazy";
import { packById } from "../data/site";
import { ComponentTile } from "../landing/ComponentTile";
import { cap, shotLabel, statusOf } from "../shared/status";

const WorkedExample = lazy(() => import("./WorkedExample"));

/** One pack: its status, its components (links to live playgrounds), its worked app in three presets. */
export default function PackPage({ id }: { id: string }) {
  const pack = packById.get(id);
  if (!pack)
    return (
      <div className="wrap block">
        <h2>No pack called {id}</h2>
        <a href="#/">Back</a>
      </div>
    );
  const status = statusOf(pack);
  return (
    <main className="wrap block">
      <a href="#packs">&larr; All packs</a>
      <h1>{cap(pack.id)}</h1>
      <p className="chips">
        <span className={`chip ${status === "live" ? "" : "warn"}`}>{status}</span>
        <span className="chip muted">wave {pack.wave}</span>
      </p>
      <p className="lede">{pack.pick}</p>
      {pack.example && (
        <p className="pickline">
          <b>Worked example:</b> {pack.example}
        </p>
      )}
      {pack.lines.length > 0 && <Lazy view={WorkedExample} id={pack.id} />}
      <h2>Components</h2>
      <div className="index-grid">
        {pack.items.map((item) => (
          <ComponentTile key={item.id} item={item} />
        ))}
        {pack.planned
          .filter((p) => !pack.items.some((i) => i.id === p.id))
          .map((p) => (
            <div key={p.id} className="tile card planned">
              <span className="tile-body">
                <b>{p.id}</b>
                <span className="chip muted">planned · {p.group}</span>
                <span className="purpose">{p.summary}</span>
              </span>
            </div>
          ))}
      </div>
      <p className="muted">{shotLabel(pack)}</p>
    </main>
  );
}
