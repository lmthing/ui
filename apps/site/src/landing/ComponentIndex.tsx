import { useState } from "react";
import { site } from "../data/site";
import { ComponentTile } from "./ComponentTile";
import { IndexFilters, noFilters, type Filters } from "./IndexFilters";

const matches = (item: (typeof site.items)[number], f: Filters) =>
  `${item.id} ${item.purpose} ${item.pick}`.toLowerCase().includes(f.query.toLowerCase()) &&
  (f.group === "all" || item.group === f.group) &&
  (f.pack === "all" || (item.pack ?? "core") === f.pack) &&
  (f.state === "all" || item.state === f.state);

/** Every catalog component, searchable, with its screenshot from the static gallery export. */
export function ComponentIndex() {
  const [filters, setFilters] = useState<Filters>(noFilters);
  const shown = site.items.filter((item) => matches(item, filters));
  return (
    <section className="block wrap" id="components">
      <p className="eyebrow">Components</p>
      <h2>{site.items.length} components, each with a live playground</h2>
      <IndexFilters filters={filters} set={setFilters} count={shown.length} />
      <div className="index-grid">
        {shown.map((item) => (
          <ComponentTile key={item.id} item={item} />
        ))}
      </div>
      {!shown.length && <p className="lede">No component matches.</p>}
    </section>
  );
}
