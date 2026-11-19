import { Segmented } from "../playground/controls/Segmented";
import { site } from "../data/site";

export const states = ["all", "ready", "pack in progress", "draft"] as const;
export type Filters = { query: string; group: string; pack: string; state: (typeof states)[number] };
export const noFilters: Filters = { query: "", group: "all", pack: "all", state: "all" };

const groups = ["all", ...new Set(site.items.map((i) => i.group))];
const packs = ["all", "core", ...site.packs.filter((p) => p.items.length).map((p) => p.id)];

/** Search, then one labelled row of choices each for group, pack and status, with the count. */
export function IndexFilters({
  filters,
  set,
  count,
}: {
  filters: Filters;
  set: (next: Filters) => void;
  count: number;
}) {
  return (
    <div className="filters">
      <input
        type="search"
        placeholder="Search by name or purpose"
        aria-label="Search components"
        value={filters.query}
        onChange={(e) => set({ ...filters, query: e.target.value })}
      />
      <div className="filter-row">
        <span className="name">group</span>
        <Segmented
          label="Group"
          value={filters.group}
          options={groups}
          onChange={(group) => set({ ...filters, group })}
          wrap
        />
      </div>
      <div className="filter-row">
        <span className="name">pack</span>
        <Segmented
          label="Pack"
          value={filters.pack}
          options={packs}
          onChange={(pack) => set({ ...filters, pack })}
          wrap
        />
      </div>
      <div className="filter-row">
        <span className="name">status</span>
        <Segmented
          label="Status"
          value={filters.state}
          options={states}
          onChange={(state) => set({ ...filters, state: state as Filters["state"] })}
          wrap
        />
      </div>
      <p className="count" role="status">
        {count} shown
      </p>
    </div>
  );
}
