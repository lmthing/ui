import { useState } from "react";
import { site } from "../data/site";
import { IndexFilters, noFilters, type Filters } from "./IndexFilters";
import { Specimen } from "./Specimen";

const matches = (item: (typeof site.items)[number], f: Filters) =>
  `${item.id} ${item.purpose} ${item.pick}`.toLowerCase().includes(f.query.toLowerCase()) &&
  (f.group === "all" || item.group === f.group) &&
  (f.pack === "all" || (item.pack ?? "core") === f.pack) &&
  (f.state === "all" || item.state === f.state);

/** The whole catalog, numbered, with search and filters. */
export default function ComponentsPage() {
  const [filters, setFilters] = useState<Filters>(noFilters);
  const found = site.items.filter((item) => matches(item, filters));
  return (
    <main id="main" className="wrap page">
      <a href="#/">&larr; Home</a>
      <h1>Components</h1>
      <p className="lede">
        {site.items.length} components: {site.stats.core} core and {site.items.length - site.stats.core} in
        packs. Each shows its first example and the wire line a model writes for it.
      </p>
      <IndexFilters filters={filters} set={setFilters} count={found.length} />
      <div className="specimens all">
        {found.map((item) => (
          <Specimen key={item.id} item={item} />
        ))}
      </div>
      {!found.length && (
        <div className="empty">
          <h2>No component matches</h2>
          <p className="lede">Try fewer words, or clear the filters.</p>
          <p className="actions">
            <button className="btn" onClick={() => setFilters(noFilters)}>
              Clear filters
            </button>
          </p>
        </div>
      )}
    </main>
  );
}
