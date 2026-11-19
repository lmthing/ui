import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  planAct,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../../test/render";

const definition = components.BabyLog;
const { props, meta, examples, fallback, probes } = definition;
const entry = { kind: "feed_left", time: "07:30" } as const;
const sample = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown, state: "filled" | "empty" = "filled") =>
  renderInstance("BabyLog", input, state, theme, { component: "b1" });

describe("BabyLog schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to no timer and accepts 12 log entries and 10 amount characters", () => {
    const max = { ...entry, minutes: 0, amount: ` ${"x".repeat(10)} ` };
    const parsed = props.parse({ log: Array.from({ length: 12 }, () => max) });
    expect(parsed.running).toBe("none");
    expect(parsed.log[0]?.amount).toBe("x".repeat(10));
    expect(parsed.entries).toHaveLength(17);
    expect(props.parse({ log: [] }).entries).toHaveLength(5);
  });
  it.each([
    {},
    { log: Array.from({ length: 13 }, () => entry) },
    { log: [entry], running: true },
    { log: [entry], running: "nap" },
    { log: [entry], color: "red" },
    { log: [entry], entries: [] },
    { log: [{ ...entry, kind: "nap" }] },
    { log: [{ ...entry, time: "7:30" }] },
    { log: [{ ...entry, time: "24:00" }] },
    { log: [{ ...entry, time: "07:60" }] },
    { log: [{ ...entry, minutes: -1 }] },
    { log: [{ ...entry, minutes: Infinity }] },
    { log: [{ ...entry, amount: " " }] },
    { log: [{ ...entry, amount: "x".repeat(11) }] },
    { log: [{ ...entry, id: "r6" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("gives the view validator item IDs", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["entries"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("BabyLog fallback and contract", () => {
  const empty: CastLike = { things: [], items: [] };
  const matching: CastLike = {
    things: [{ type: "record", fields: ["category", "at"] }],
    items: [{ id: "one", type: "record", sample: true, category: "Feed left", at: "07:30" }],
  };
  const malformed: CastLike = {
    things: matching.things,
    items: [{ id: "two", type: "record", sample: true, category: "Feed left", at: "29:00" }],
  };
  it("uses compatible cast values but never invents log entries", () => {
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: matching })).toEqual({ log: [entry], running: "none" });
    expect(fallback({ cast: empty })).toEqual({ log: [], running: "none" });
    expect(fallback({ cast: malformed })).toEqual(fallback({ cast: empty }));
  });
  it("has the dense phone contract and core-first probes, without opening the incomplete home pack", () => {
    expect(meta).toMatchObject({ states: ["filled", "empty"], dense: true, tier: "phone" });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: ["home"], includeDrafts: true }).schema("BabyLog")).toBe(props);
    expect(createRegistry({ packs: ["home"] }).ids).not.toContain("BabyLog");
    expect(probes.filter((p) => p.kind === "choose").map((p) => p.expect)).toEqual(["BabyLog", "Timer"]);
    expect(probes.find((p) => p.kind === "write")?.expect).toBe("BabyLog");
    expect(probes.filter((p) => p.kind === "read").map((p) => p.expect.action)).toEqual([
      "stop",
      "start",
      "press",
    ]);
  });
});

describe("BabyLog states and parts", () => {
  it("draws the running clock, five addressed tiles, and only present row parts", () => {
    const html = render(sample);
    for (const part of ["root", "running", "elapsed", "heading"]) elementAt(html, `home/b1/${part}`);
    for (let i = 1; i <= 5; i++) {
      const tile = `home/b1/r${i}`;
      expect(elementAt(html, `${tile}/root`).attributes).toContain('role="button"');
      elementAt(html, `${tile}/label`);
      elementAt(html, `${tile}/icon`);
    }
    expect(elementAt(html, "home/b1/r5/root").attributes).toContain('aria-pressed="true"');
    for (const part of ["root", "kind", "time", "minutes"]) elementAt(html, `home/b1/r6/${part}`);
    expect(html).not.toContain("home/b1/r6/amount");
    expect(html).not.toContain("home/b1/r7/minutes");
    elementAt(html, "home/b1/r8/amount");
    expect(html).toContain("Last 07:30");
  });
  it("draws a neutral empty state and preserves quick tiles for a filled log with no entries", () => {
    const empty = render(sample, "empty");
    elementAt(empty, "home/b1/root");
    elementAt(empty, "home/b1/empty");
    expect(empty).toContain(emptyLine());
    expect(empty).not.toContain("home/b1/r1/root");
    expect(empty).not.toContain("home/b1/running");
    const initial = render({ log: [] });
    elementAt(initial, "home/b1/r1/root");
    elementAt(initial, "home/b1/empty");
    expect(initial).not.toContain("home/b1/elapsed");
    expect(initial).not.toContain("home/b1/r6/root");
  });
});

describe("BabyLog read and act", () => {
  it.each(["none", "feed_left", "feed_right", "bottle", "nappy", "sleep"] as const)(
    "offers exactly the supported item actions with %s running",
    (running) => {
      const input = { log: [entry], running };
      const stamped = stampItemIds(meta, props.parse(input));
      const actions = affordancesOf(meta, stamped, "b1");
      expect(actions.map(({ address, action }) => [address, action])).toEqual([
        ...stamped.entries
          .slice(0, 5)
          .map((row, index) => [`b1/r${index + 1}`, row.kind === running ? "stop" : "start"]),
        ["b1/r6", "press"],
      ]);
      const screen = { id: "home", components: [{ id: "b1", c: "BabyLog", ...input }] };
      const defs = { BabyLog: definition };
      const read = readComponent(definition, input, "b1").join("\n");
      for (const { address, action } of actions) {
        expect(read).toContain(`[${address} ${action}]`);
        expect(planAct(screen, defs, {}, [{ address, action }])).toMatchObject({ ok: true });
        for (const other of ["start", "stop", "press", "delete"].filter((other) => other !== action)) {
          expect(planAct(screen, defs, {}, [{ address, action: other }])).toMatchObject({
            ok: false,
            code: "not_actionable",
          });
        }
      }
    },
  );
  it("reads visible amounts and times, and does not read hidden controls in empty state", () => {
    const read = readComponent(definition, sample, "b1").join("\n");
    expect(read).toContain("Sleep running");
    expect(read).toContain("r5 Sleep · Stop");
    expect(read).toContain("r6 Feed left · 07:30 · 12 min");
    expect(read).toContain("r8 Bottle · 09:00 · 90 ml");
    expect(readComponent(definition, sample, "b1", "empty")).toEqual(["b1 BabyLog (empty)"]);
  });
});
