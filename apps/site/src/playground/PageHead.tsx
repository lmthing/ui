import type { Item } from "../../scripts/site-types";
import { packById } from "../data/site";
import { hrefOf } from "../router";
import { cap, tierLabel } from "../shared/status";

/** The component's name, purpose, tier, status and pack link. */
export function PageHead({ id, item }: { id: string; item: Item }) {
  const pack = item.pack ? packById.get(item.pack) : null;
  return (
    <>
      <a href="#components">&larr; All components</a>
      <h1>{id}</h1>
      <p className="lede">{item.purpose}</p>
      <p className="chips">
        <span className="chip muted">
          {pack ? `${cap(pack.id)} pack` : "core"} · {item.group}
        </span>
        <span className="chip">{tierLabel[item.tier] ?? item.tier}</span>
        <span className={`chip ${item.state === "ready" ? "" : "warn"}`}>{item.state}</span>
      </p>
      {pack && (
        <p className="muted">
          <a href={hrefOf("p", pack.id)}>See the whole {pack.id} pack</a>
        </p>
      )}
      <p className="pickline">
        <b>Pick it when:</b> {item.pick}
      </p>
    </>
  );
}
