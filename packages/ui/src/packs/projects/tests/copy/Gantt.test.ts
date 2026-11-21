import { describe, expect, it } from "vitest";
import { ganttChart, ganttCopy } from "../../copy";

const task = {
  kind: "task",
  id: "r1",
  title: "Check site",
  taskRef: "check",
  after: [],
  start: "2026-11-13",
  end: "2026-11-16",
  goto: "site",
} as const;
const first = { ...task, after: [] };
const second = {
  ...first,
  id: "r2",
  title: "Set layout",
  taskRef: "layout",
  after: ["check", "external"],
  start: "2026-11-16",
  end: "2026-11-19",
  goto: undefined,
};
const gate = { kind: "gate", id: "r4", title: "Ready", due: "2026-11-22" } as const;
const input = {
  from: "2026-11-16",
  to: "2026-11-22",
  style: "week",
  detail: "full",
  targets: [
    first,
    second,
    { ...first, id: "r3", taskRef: "later", start: "2026-11-23", end: "2026-11-24" },
    gate,
  ],
} as const;

describe("Gantt chart projection", () => {
  it("clips intersections, drops out-of-range marks, and computes inclusive conflicts and links", () => {
    const { columns, rows, gates, links } = ganttChart(input);
    expect(columns.map(({ label }) => label)).toEqual(["16", "17", "18", "19", "20", "21", "22"]);
    expect(rows).toEqual([
      {
        id: "r1",
        label: "Check site",
        start: 0,
        end: 1 / 7,
        clippedStart: true,
        clippedEnd: false,
        conflict: false,
        target: { part: "root" },
      },
      {
        id: "r2",
        label: "Set layout",
        start: 0,
        end: 4 / 7,
        clippedStart: false,
        clippedEnd: false,
        conflict: true,
      },
    ]);
    expect(gates).toEqual([{ id: "r4", label: "Ready", at: 6.5 / 7 }]);
    expect(links).toEqual([{ from: "r1", to: "r2" }]);
    expect(first.start).toBe("2026-11-13");
    expect(second.after).toEqual(["check", "external"]);
  });
  it("keeps days the same width in a partial last week and clips at the last included date", () => {
    const { columns, gates, rows } = ganttChart({
      ...input,
      to: "2026-11-24",
      style: "month",
      targets: [
        { ...second, start: "2026-11-23", end: "2026-12-02" },
        { ...gate, due: "2026-11-24" },
      ],
    });
    expect(columns.map(({ label }) => label)).toEqual(["16 Nov", "23 Nov"]);
    expect(rows[0]).toMatchObject({ start: 0.5, end: 9 / 14, clippedEnd: true });
    expect(gates[0]?.at).toBeCloseTo(8.5 / 14);
  });
  it("keeps the original dates and unresolved references available in the full schedule", () => {
    const { entries } = ganttCopy(input);
    expect(entries[0]?.dates).toBe("13 Nov – 16 Nov");
    expect(entries[1]).toMatchObject({ after: "After Check site, external", conflict: true });
    expect(entries[2]).toMatchObject({ inRange: false, dates: "23 Nov – 24 Nov" });
    expect(
      ganttCopy({ ...input, detail: "brief" }).entries.every(({ dates, after }) => !dates && !after),
    ).toBe(true);
  });
  it("clips long rail labels without shortening the addressed title", () => {
    const schedule = { ...input, targets: [{ ...first, title: "Check balcony light" }] };
    expect(ganttChart(schedule).rows[0]?.label).toBe("Check…");
    expect(ganttCopy(schedule).entries[0]?.entry.title).toBe("Check balcony light");
  });
});
