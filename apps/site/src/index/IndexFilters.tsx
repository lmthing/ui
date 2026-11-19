import { site } from "../data/site";

export const states = ["all", "ready", "pack in progress", "draft"] as const;
export type Filters = { query: string; group: string; pack: string; state: (typeof states)[number] };
export const noFilters: Filters = { query: "", group: "all", pack: "all", state: "all" };

const groups = ["all", ...new Set(site.items.map((i) => i.group))];
const packs = ["all", "core", ...site.packs.filter((p) => p.items.length).map((p) => p.id)];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

/** Search box and three selects over the component index. */
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
      <Select
        label="Group"
        value={filters.group}
        options={groups}
        onChange={(group) => set({ ...filters, group })}
      />
      <Select
        label="Pack"
        value={filters.pack}
        options={packs}
        onChange={(pack) => set({ ...filters, pack })}
      />
      <Select
        label="Status"
        value={filters.state}
        options={states}
        onChange={(state) => set({ ...filters, state: state as Filters["state"] })}
      />
      <span className="count" role="status">
        {count} shown
      </span>
    </div>
  );
}
