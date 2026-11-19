import type { Item } from "../../scripts/site-types";
import { shotOf, site } from "../data/site";
import { hrefOf } from "../router";
import { preloadKit } from "../shared/preload";
import { JsonLine } from "../shared/JsonLine";
import { tierLabel } from "../shared/status";

/** The specimen number: the component's place in the catalog, as in a type specimen book. */
export const numberOf = (id: string) =>
  `No. ${String(site.items.findIndex((i) => i.id === id) + 1).padStart(2, "0")}`;

/** One component as a specimen: number, name, its drawing, and the wire line a model writes. */
export function Specimen({ item }: { item: Item }) {
  return (
    <article className="specimen">
      <a href={hrefOf("c", item.id)} className="spec-link" onPointerEnter={preloadKit} onFocus={preloadKit}>
        <p className="spec-head">
          <span>{numberOf(item.id)}</span>
          <span>
            {item.pack ?? "core"} · {item.group}
            {item.state !== "ready" ? ` · ${item.state}` : ""}
          </span>
        </p>
        <span className={`spec-shot ${item.state === "draft" ? "none" : ""}`}>
          {item.state === "draft" ? (
            "draft: schema and examples, no view yet"
          ) : (
            <img src={shotOf(item.id)} alt={`${item.id}, first example`} loading="lazy" />
          )}
        </span>
        <h3>{item.id}</h3>
        <span className="purpose">{item.purpose}</span>
      </a>
      {item.line && (
        <span className="spec-line">
          <JsonLine line={item.line.replace('"id":"x1",', "")} max={3} />
        </span>
      )}
      <small>{tierLabel[item.tier] ?? item.tier}</small>
    </article>
  );
}
