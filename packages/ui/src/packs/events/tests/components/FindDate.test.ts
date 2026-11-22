import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readScreen,
  type DeviceData,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { FindDate } = components;
const { props, meta, fallback, examples, probes } = FindDate;
type Input = ReturnType<typeof fallback>;
const first: Input = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const host = (row: number, instance = "f1"): DeviceData => ({ eventViewer: [{ instance, row }] });
const screen = (input = first, state: StateName = "filled") => ({
  id: "home",
  components: [{ id: "f1", c: "FindDate", state, ...input }],
});
const defs = { FindDate };
const address = (part: string) => `home/f1/${part}`;
const read = (data: DeviceData, input = first) => readScreen(screen(input), defs, {}, undefined, data);
const render = (input = first, state: StateName = "filled", deviceData = host(0)) =>
  addressedElements(renderInstance("FindDate", input, state, theme, { component: "f1", deviceData }));

describe("FindDate contract and fallback", () => {
  it.each(examples)("accepts an events example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );

  it("bounds candidates and answers and keeps identity and derived fields off the wire", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["cells"][number]["id"]>().toEqualTypeOf<string>();
    const dates = Array.from({ length: 6 }, (_, i) => ({ date: `2027-06-1${i}` }));
    const person = { name: "x".repeat(16), answers: Array(6).fill("none") };
    const people = Array(12).fill(person);
    expect(props.parse({ dates, people }).cells).toHaveLength(72);
    for (const fields of [
      { dates: dates.slice(1), people },
      { dates: [...dates, { date: "2027-07-01" }], people },
      { dates, people: [...people, person] },
      { dates, people: [{ ...person, name: "x".repeat(17) }] },
      { dates: [] },
      { people: [] },
      { dates: [first.dates[0], first.dates[0]] },
      { dates: [{ date: "2027-02-29" }, first.dates[1]] },
      { dates: [{ date: "2027-04-09", time: "24:00" }, first.dates[1]] },
      { people: [{ name: "Imani", answers: ["yes", "later"] }] },
      { people: [{ ...first.people[0], own: true }] },
      { eventViewer: host(0).eventViewer },
      { answer_r1: "yes" },
      { cells: [] },
      { best: 1 },
      { detail: "tiny" },
    ])
      expect(props.safeParse({ ...first, ...fields }).success, JSON.stringify(fields)).toBe(false);
    const sameDay = [
      { date: "2027-04-09", time: "18:30" },
      { date: "2027-04-09", time: "19:00" },
    ];
    expect(props.safeParse({ ...first, dates: sameDay }).success).toBe(true);
  });

  it("uses a cast title or a neutral placeholder without guessing replies", () => {
    const cast = { things: [], items: [{ id: "one", type: "person", sample: true, title: "Mara" }] };
    const emptyCast = fallback({ cast: { things: [], items: [] } });
    expect(emptyCast.people).toEqual([{ name: placeholderTitle(0), answers: ["none", "none"] }]);
    expect(fallback({ cast }).people).toEqual([{ name: "Mara", answers: ["none", "none"] }]);
    expect(props.safeParse(emptyCast).success).toBe(true);
  });

  it("retains the pack gate, people tier, core near miss, and variant probe", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "people", weight: 3, dense: true });
    for (const probe of [
      { kind: "choose", expect: "FindDate" },
      { kind: "choose", expect: "Calendar" },
      { kind: "write", expect: "FindDate" },
      { kind: "write", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "f1/r2", action: "select" } },
    ])
      expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("FindDate states and parts", () => {
  it("draws dates, named replies, and the winning total", () => {
    const parts = render();
    expect(parts.get(address("best"))?.text).toEqual(["Best fit: 9 Apr 2027 · 18:30"]);
    expect(parts.get(address("count"))?.text).toEqual(["1 yes · 1 maybe"]);
    expect(parts.get(address("r1/root"))?.attributes).toContain('role="button"');
    expect(parts.get(address("r3/root"))?.text).toEqual(["Maybe"]);
    expect([...render({ ...first }).keys()]).toEqual([...parts.keys()]);
    expect([...render({ ...first, detail: "brief" }).keys()]).toEqual(
      [...parts.keys()].filter((key) => key !== address("guide")),
    );
  });

  it("draws an intentional empty state and keeps the no-vote matrix usable", () => {
    const emptyParts = render(first, "empty");
    expect([...emptyParts.keys()]).toEqual([address("root"), address("empty")]);
    expect(emptyParts.get(address("empty"))?.text).toEqual(["No dates yet"]);
    const empty = createScreenController({ screen: screen(first, "empty"), defs, deviceData: host(0) });
    expect(empty.actionsAt("f1/r1")).toEqual([]);
    empty.dispose();
    const input = fallback({ cast: { items: [], things: [] } });
    const parts = render(input);
    expect(parts.get(address("best"))?.text).toEqual(["No date leads yet"]);
    expect(parts.has(address("count"))).toBe(false);
    expect(parts.get(address("r2/root"))?.attributes).toContain('role="button"');
  });
});

describe("FindDate read and act", () => {
  it.each([
    {},
    host(2),
    host(0, "other"),
    { eventViewer: [null, { instance: "f1", row: "0" }] },
    {
      eventViewer: [...host(0).eventViewer!, ...host(1).eventViewer!],
    },
  ])("fails closed without a single matching row binding: %o", (deviceData) => {
    const runtime = createScreenController({ screen: screen(), defs, deviceData });
    expect(read(deviceData)).not.toMatch(/\[f1\/r\d+ (select|press)/);
    expect(runtime.press("f1/r1")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(runtime.act({ address: "f1/r1", action: "select", value: "yes" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(render(first, "filled", deviceData).get(address("r1/root"))?.text).toEqual(["Yes"]);
    runtime.dispose();
  });

  it("opens the bound row's picker and changes only that cell, then closes it", () => {
    const deviceData = host(1);
    const runtime = createScreenController({ screen: screen(), defs, deviceData });
    const pick = (part: string, value: string) =>
      runtime.act({ address: `f1/${part}`, action: "select", value });
    expect(runtime.actionsAt("f1/r1")).toEqual([]);
    expect(runtime.actionsAt("f1/r3")).toEqual(expect.arrayContaining(["press", "select"]));
    expect(runtime.press("f1/r4").ok).toBe(true);
    expect(runtime.store.get(address("$picker"))).toBe("r4");
    expect(pick("r4", "none")).toMatchObject({ ok: false, code: "invalid_value" });
    expect(pick("r4", "yes").ok).toBe(true);
    expect(runtime.store.get(address("$picker"))).toBeUndefined();
    expect(pick("r3", "No").ok).toBe(true);
    expect(runtime.read()).toContain("Imani Cole: Yes · No reply");
    expect(runtime.read()).toContain("Hugo Wells: No · Yes");
    expect(runtime.read()).toContain("Best fit: 9 Apr 2027 · 18:30");
    expect(pick("r1", "no")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(pick("r3", "maybe").ok).toBe(true);
    expect(runtime.read()).toContain("1 yes · 1 maybe");
    expect(pick("r3", "yes").ok).toBe(true);
    expect(runtime.read()).toContain("2 yes · 0 maybe");
    expect(runtime.read()).not.toContain("[f1/r1 ");
    runtime.dispose();
  });

  it("recomputes the best date after a participant changes their mind", () => {
    const runtime = createScreenController({ screen: screen(), defs, deviceData: host(0) });
    expect(runtime.act({ address: "f1/r1", action: "select", value: "no" }).ok).toBe(true);
    expect(runtime.act({ address: "f1/r2", action: "select", value: "yes" }).ok).toBe(true);
    expect(runtime.read()).toContain("Best fit: 10 Apr 2027 · 19:00");
    expect(runtime.read()).toContain("1 yes · 0 maybe");
    runtime.dispose();
  });
});
