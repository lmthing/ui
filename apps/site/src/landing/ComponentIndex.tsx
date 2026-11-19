import { useState } from "react";
import { site } from "../data/site";
import { ComponentTile } from "./ComponentTile";
import { IndexFilters, noFilters, type Filters } from "./IndexFilters";

const initial = 24;

const matches = (item: (typeof site.items)[number], f: Filters) =>
  `${item.id} ${item.purpose} ${item.pick}`.toLowerCase().includes(f.query.toLowerCase()) &&
  (f.group === "all" || item.group === f.group) &&
  (f.pack === "all" || (item.pack ?? "core") === f.pack) &&
  (f.state === "all" || item.state === f.state);

/** Every catalog component, searchable, with its screenshot from the static gallery export. */
export function ComponentIndex() {
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [all, setAll] = useState(false);
  const found = site.items.filter((item) => matches(item, filters));
  const filtering = JSON.stringify(filters) !== JSON.stringify(noFilters);
  const shown = all || filtering ? found : found.slice(0, initial);
  return (
    <section className="block wrap" id="components">
      <p className="eyebrow">Components</p>
      <h2>{site.items.length} components, each with a live playground</h2>
      <IndexFilters filters={filters} set={setFilters} count={found.length} />
      <div className="index-grid">
        {shown.map((item) => (
          <ComponentTile key={item.id} item={item} />
        ))}
      </div>
      {!all && !filtering && found.length > initial && (
        <div className="more">
          <button className="btn" onClick={() => setAll(true)}>
            Show all {found.length}
          </button>
        </div>
      )}
      {!shown.length && <p className="lede">No component matches.</p>}
    </section>
  );
}
