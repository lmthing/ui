import type { Pack } from "../../scripts/site-types";
import { shotOf } from "../data/site";
import { hrefOf } from "../router";
import { cap, statusOf } from "../shared/status";

const thumbs = 4;
const names = 6;

/** The pack's face: component thumbnails when it has built ones, otherwise its planned component names. */
function Face({ pack }: { pack: Pack }) {
  const shown = pack.items.filter((i) => i.state !== "draft").slice(0, thumbs);
  if (shown.length) {
    return (
      <span className="strip" aria-hidden="true">
        {shown.map((i) => (
          <span key={i.id} className="thumb">
            <img src={shotOf(i.id)} alt="" loading="lazy" />
          </span>
        ))}
      </span>
    );
  }
  return null;
}

function Names({ pack }: { pack: Pack }) {
  const all = pack.items.length ? pack.items.map((i) => i.id) : pack.planned.map((p) => p.id);
  return (
    <span className="chips">
      {all.slice(0, names).map((id) => (
        <span key={id} className="chip muted">
          {id}
        </span>
      ))}
      {all.length > names && <span className="chip muted">+{all.length - names}</span>}
    </span>
  );
}

/** One pack: status computed from the catalog, a visual, its components, progress and a link to its page. */
export function PackCard({ pack }: { pack: Pack }) {
  const status = statusOf(pack);
  const built = pack.items.filter((i) => i.state !== "draft").length;
  const total = pack.plannedComponents || pack.items.length;
  return (
    <a className={`pack card status-${status.replace(" ", "-")}`} href={hrefOf("p", pack.id)}>
      <Face pack={pack} />
      <span className="pack-head">
        <h3>{cap(pack.id)}</h3>
        <span className={`chip ${status === "live" ? "" : status === "planned" ? "muted" : "warn"}`}>
          {status}
        </span>
      </span>
      <span className="pick">{pack.pick}</span>
      <Names pack={pack} />
      <span className="bar" aria-hidden="true">
        <i style={{ width: `${total ? Math.round((built / total) * 100) : 0}%` }} />
      </span>
      <small>
        {built} of {total} components built · {pack.builtArchetypes} of {pack.plannedArchetypes} archetypes
        built
      </small>
    </a>
  );
}
