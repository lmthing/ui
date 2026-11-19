import type { Pack } from "../../scripts/site-types";
import { hrefOf } from "../router";
import { cap, statusOf } from "../shared/status";

/** One pack: its status computed from the catalog, how much is built, and a link to its page. */
export function PackCard({ pack }: { pack: Pack }) {
  const status = statusOf(pack);
  const built = pack.items.filter((i) => i.state !== "draft").length;
  const total = pack.plannedComponents || pack.items.length;
  const pct = total ? Math.round((built / total) * 100) : 0;
  return (
    <a className={`pack card status-${status.replace(" ", "-")}`} href={hrefOf("p", pack.id)}>
      <span className="pack-head">
        <h3>{cap(pack.id)}</h3>
        <span className={`chip ${status === "live" ? "" : status === "planned" ? "muted" : "warn"}`}>
          {status}
        </span>
      </span>
      <span className="pick">{pack.pick}</span>
      <span className="bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
      <small>
        {built} of {total} components built · {pack.plannedArchetypes} archetypes planned
      </small>
    </a>
  );
}
