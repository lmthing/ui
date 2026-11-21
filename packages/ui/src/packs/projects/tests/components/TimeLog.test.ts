import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, planAct, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample } from "../../../../../test/render";

const { TimeLog } = components;
const { props, examples, fallback, probes } = TimeLog;
const first = examples[0]!;
const row = first.entries[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = { TimeLog };
const screen = (input: object = first, state = "filled" as const) => ({
  id: "home",
  components: [{ ...input, c: "TimeLog", id: "t1", state }],
});
const start = { address: "t1/timer", action: "start" };
const stop = { address: "t1/timer", action: "stop" };
const remove = { address: "t1/r1/remove", action: "press" };
const data = {
  project_calendar: [{ timeZone: "America/New_York" }],
  project_time_targets: [
    { projectRef: first.projectRef, taskRef: first.taskRef, title: row.title, billable: true },
  ],
};
const at = Date.parse("2026-11-19T15:00:00Z");

describe("TimeLog contract and fallback", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("preserves the week and single-day entry bounds", () => {
    const entries = Array.from({ length: 15 }, (_, hour) => ({
      ...row,
      start: `${first.week}T${String(hour).padStart(2, "0")}:00:00Z`,
      end: `${first.week}T${String(hour).padStart(2, "0")}:30:00Z`,
    }));
    const day = { ...first, style: "single_day", day: first.week };
    expect(props.safeParse({ ...first, entries: entries.slice(0, 14) }).success).toBe(true);
    expect(props.safeParse({ ...day, entries: entries.slice(0, 6) }).success).toBe(true);
    for (const input of [
      { ...first, entries },
      { ...day, entries: entries.slice(0, 7) },
      { ...first, entries: [row, row] },
      { ...day, day: "2026-11-23" },
      { ...first, entries: [{ ...row, title: "x".repeat(33) }] },
      { ...first, entries: [{ ...row, duration: 30 }] },
      { ...first, color: "red" },
      { ...first, timerRunning: true },
    ])
      expect(props.safeParse(input).success).toBe(false);
  });
  it("uses the cast or neutral placeholders and keeps its probes", () => {
    const thing = { type: "record", fields: ["label"] };
    const cast = (label: unknown) => ({
      things: [thing],
      items: [{ id: "record", type: "record", sample: true, label }],
    });
    expect(props.parse(fallback({ cast: cast("Survey") })).entries[0]?.title).toBe("Survey");
    for (const empty of [{ things: [], items: [] }, cast(7)])
      expect(props.parse(fallback({ cast: empty })).entries[0]?.title).toBe("Item one");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(createRegistry({ packs: ["projects"] }).ids.includes("TimeLog")).toBe(packReady("projects"));
  });
});

describe("TimeLog states, reads and addresses", () => {
  it("retains stable addresses while ordering, filtering and hiding notes", () => {
    const reversed = { ...first, entries: [...first.entries].reverse() };
    const draw = (input: object) => addressedElements(renderExample("TimeLog", input, "filled", theme).html);
    const full = [...draw(reversed).keys()];
    expect(full.indexOf("home/c1/r2/root")).toBeLessThan(full.indexOf("home/c1/r1/root"));
    expect([...draw({ ...reversed, density: "compact" }).keys()]).toEqual(full);
    expect([...draw({ ...reversed, detail: "brief" }).keys()]).toEqual(
      full.filter((key) => !key.endsWith("/note")),
    );
    const daily = { ...reversed, style: "single_day", day: first.week };
    const read = readComponent(TimeLog, daily, "t1").join("\n");
    expect(draw(daily).has("home/c1/r1/root")).toBe(false);
    expect(draw(daily).get("home/c1/week_total")?.text).toEqual(["1h 45m"]);
    expect(draw(daily).get("home/c1/day_total")?.text).toEqual(["30m"]);
    expect(read).toContain("1h 45m");
    expect(read).toContain("[t1/r2/remove press]");
    expect(read).not.toContain("[t1/r1/remove press]");
  });
  it("draws loading, empty and saved feedback without inert item actions", () => {
    const draw = (state: "loading" | "empty" | "success") =>
      addressedElements(renderExample("TimeLog", first, state, theme, { component: "t1" }).html);
    expect(draw("loading").has("home/t1/r1/root")).toBe(false);
    expect(draw("loading").get("home/t1/timer")?.attributes).toContain('aria-busy="true"');
    expect(draw("loading").get("home/t1/r1/remove")?.attributes).not.toContain('role="button"');
    expect(draw("empty").has("home/t1/empty")).toBe(true);
    expect(draw("empty").has("home/t1/export")).toBe(false);
    expect(draw("empty").has("home/t1/add")).toBe(true);
    expect(draw("success").get("home/t1/status")?.text).toEqual(["Entry saved"]);
    expect(
      planAct({ ...screen(), components: [{ ...screen().components[0]!, state: "loading" }] }, defs, {}, [
        remove,
      ]).ok,
    ).toBe(false);
  });
});

describe("TimeLog actions", () => {
  it("links rows and manual entry, and only exports a saved week", () => {
    const press = (address: string, input: object = first) =>
      planAct(screen(input), defs, {}, [{ address, action: "press" }]);
    expect(press("t1/r1")).toMatchObject({ ok: true, links: [{ goto: "survey_time" }] });
    expect(press("t1/r2").ok).toBe(false);
    expect(press("t1/add")).toMatchObject({ ok: true, links: [{ goto: "new_time" }] });
    expect(press("t1/add", { ...first, addGoto: undefined }).ok).toBe(false);
    expect(press("t1/export").ok).toBe(true);
    expect(press("t1/export", { ...first, entries: [] }).ok).toBe(false);
    expect(TimeLog.meta.partTiers.export).toBe("service");
  });
  it("stops once, writes the host-local record and confirms removal without shifting surviving addresses", () => {
    let now = at;
    const controller = createScreenController({ screen: screen(), defs, deviceData: data, now: () => now });
    const saved = () => controller.snapshotScreen().components[0]!.entries;
    try {
      expect(controller.act(start).ok).toBe(true);
      expect(controller.act(start).ok).toBe(false);
      now += 65_000;
      expect(controller.read()).toContain("1:05");
      expect(controller.act([stop, stop]).ok).toBe(false);
      expect(saved()).toHaveLength(2);
      expect(controller.act(stop).ok).toBe(true);
      expect(controller.act(stop).ok).toBe(false);
      expect(saved()).toHaveLength(3);
      expect(saved()).toContainEqual({
        projectRef: first.projectRef,
        taskRef: first.taskRef,
        title: row.title,
        billable: true,
        start: "2026-11-19T10:00:00.000-05:00",
        end: "2026-11-19T10:01:05.000-05:00",
      });
      expect(controller.read()).toContain("Entry saved");
      expect(controller.act(remove).ok).toBe(true);
      expect(saved()).toHaveLength(3);
      expect(controller.act({ address: "confirm/confirm", action: "press" }).ok).toBe(true);
      expect(saved()).toHaveLength(2);
      expect(controller.read()).not.toContain("[t1/r1/remove press]");
      expect(controller.read()).toContain("[t1/r3/remove press]");
    } finally {
      controller.dispose();
    }
  });
});

describe("TimeLog timer gates", () => {
  it("rejects missing, blocked, out-of-window and overlapping timer targets", () => {
    for (const [input, snapshot, now] of [
      [first, {}, at],
      [first, { ...data, project_time_targets: [] }, at],
      [first, data, at + 7 * 86_400_000],
      [first, data, Date.parse(row.start)],
      [{ ...first, style: "single_day", day: first.week }, data, at],
    ] as const)
      expect(planAct(screen(input), defs, {}, [start], null, "planner", snapshot, now).ok).toBe(false);
  });
  it("discards an invalid session without appending a record", () => {
    const now = vi.fn(() => at);
    const controller = createScreenController({ screen: screen(), defs, deviceData: data, now });
    try {
      expect(controller.act(start).ok).toBe(true);
      now.mockReturnValue(at + 7 * 86_400_000);
      expect(controller.act(stop).ok).toBe(false);
      expect(controller.act({ address: "t1/discard", action: "press" }).ok).toBe(true);
      expect(controller.snapshotScreen().components[0]!.entries).toHaveLength(2);
    } finally {
      controller.dispose();
    }
  });
});
