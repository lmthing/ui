import { useEffect, useRef, useState } from "react";
import type { Item } from "../../scripts/site-types";
import { shotOf, site } from "../data/site";
import { hrefOf } from "../router";
import { preloadKit } from "../shared/preload";
import { JsonLine } from "../shared/JsonLine";
import { tierLabel } from "../shared/status";

/** The specimen number: the component's place in the catalog, as in a type specimen book. */
export const numberOf = (id: string) =>
  `No. ${String(site.items.findIndex((i) => i.id === id) + 1).padStart(2, "0")}`;

/** The drawing: paper tint and outline while it loads, then a fade-in, so a slow load never looks broken. */
function Shot({ id }: { id: string }) {
  const img = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => void (img.current?.complete && setReady(true)), []);
  return (
    <span className={`spec-shot ${ready ? "ready" : "loading"}`}>
      <img
        ref={img}
        src={shotOf(id)}
        alt={`${id}, first example`}
        loading="lazy"
        onLoad={() => setReady(true)}
      />
    </span>
  );
}

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
        {item.state === "draft" ? (
          <span className="spec-shot none">draft: schema and examples, no view yet</span>
        ) : (
          <Shot id={item.id} />
        )}
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
