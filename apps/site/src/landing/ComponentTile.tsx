import type { Item } from "../../scripts/site-types";
import { shotOf } from "../data/site";
import { hrefOf } from "../router";
import { tierLabel } from "../shared/status";

/** One component: its gallery screenshot, purpose, tier and status, linking to its playground. */
export function ComponentTile({ item }: { item: Item }) {
  return (
    <a className="tile card" href={hrefOf("c", item.id)}>
      {item.state === "draft" ? (
        <span className="shot none">Draft: schema and examples, no view yet</span>
      ) : (
        <span className="shot">
          <img src={shotOf(item.id)} alt={`${item.id}, first example`} loading="lazy" />
        </span>
      )}
      <span className="tile-body">
        <b>{item.id}</b>
        <span className="chips">
          <span className="chip muted">
            {item.pack ?? "core"} · {item.group}
          </span>
          {item.state !== "ready" && <span className="chip warn">{item.state}</span>}
        </span>
        <span className="purpose">{item.purpose}</span>
        <small>{tierLabel[item.tier] ?? item.tier}</small>
      </span>
    </a>
  );
}
