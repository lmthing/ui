import { describe, expect, expectTypeOf, it } from "vitest";
// prettier-ignore
import { affordancesOf, components, emptyLine, planAct, placeholderTitle, readComponent, stampItemIds, type CastLike,
  type Props } from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../../test/render";

const agenda = components.Agenda;
const { meta, props, examples, fallback, probes } = agenda;
const date = "2026-11-20";
const event = { title: "Walk", who: ["Sam"], time: "09:00" };
const input = { days: [{ date, events: [event] }], goto: "add_event" };
const withEvent = (entry: object) => ({ ...input, days: [{ date, events: [entry] }] });
type Parsed = ReturnType<typeof props.parse>;
const entriesOf = (parsed: Parsed) =>
  (
    parsed as Parsed & {
      entries: { id?: string; date: string; title: string; who: string[]; conflict: boolean }[];
    }
  ).entries;

describe("Agenda contract and boundaries", () => {
  it.each(examples.map((example, index) => ({ example, index })))("parses example $index", ({ example }) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    {},
    { ...input, days: [] },
    { ...input, days: Array(8).fill(input.days[0]) },
    { ...input, days: [{ date, events: [] }] },
    { ...input, days: [{ date, events: Array(7).fill(event) }] },
    { ...input, days: [{ date: "2026-02-29", events: [event] }] },
    { ...input, goto: "Add event" },
    { ...input, entries: [] },
    { ...input, add: { goto: "add_event" } },
    { ...input, color: "#fff" },
    withEvent({ ...event, title: " ".repeat(4) }),
    withEvent({ ...event, title: "x".repeat(33) }),
    withEvent({ ...event, time: "24:00" }),
    withEvent({ ...event, time: "9:00" }),
    withEvent({ ...event, who: [] }),
    withEvent({ ...event, who: Array(5).fill("Sam") }),
    withEvent({ ...event, who: ["x".repeat(13)] }),
    withEvent({ ...event, id: "r1" }),
    withEvent({ ...event, conflict: true }),
  ])("rejects out-of-contract input %#", (invalid) => {
    expect(props.safeParse(invalid).success).toBe(false);
  });

  it("accepts and stamps all 42 entries at the exact dense boundaries", () => {
    const largest = { title: "x".repeat(32), time: "23:59", who: Array(4).fill("x".repeat(12)) };
    const days = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-11-${20 + index}`,
      events: Array(6).fill(largest),
    }));
    const parsed = stampItemIds(meta, props.parse({ days, goto: "a".repeat(64) }));
    expect(entriesOf(parsed)).toHaveLength(42);
    expect(entriesOf(parsed).at(-1)).toMatchObject({ id: "r42", date: "2026-11-26" });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
  });
});

describe("Agenda fallback and probes", () => {
  it("uses neutral defaults for empty and malformed casts and titles from a matching cast", () => {
    const empty = { things: [], items: [] };
    const things = [{ type: "entry", fields: ["name"] }];
    const good = { id: "entry", type: "entry", sample: true, name: "Check supplies" };
    const casts: CastLike[] = [empty, { things, items: [good] }, { things, items: [{ ...good, name: 2 }] }];
    const parsed = casts.map((cast) => props.parse(fallback({ cast })));
    expect(parsed.map((value) => entriesOf(value)[0]?.title)).toEqual([
      placeholderTitle(0),
      good.name,
      placeholderTitle(0),
    ]);
    expect(entriesOf(parsed[0]!)[0]?.who).toEqual([placeholderTitle(0)]);
  });

  it("keeps the core near miss, write and both read probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true, weight: 3 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "read", "read", "write"]);
    expect(probes[1]).toMatchObject({ expect: "Timeline" });
    expect(probes[2]).toMatchObject({ expect: "Agenda" });
    expect(probes[3]).toMatchObject({ expect: { address: "a1/add", action: "press" } });
    expect(probes[4]).toMatchObject({ expect: { address: "a1/r1", action: "press" } });
  });
  // prettier-ignore
  it("keeps the date grouping default and omits dates from an ungrouped view and read", () => {
    expect(props.parse(input)).toMatchObject({ group: "dates", surface: "card" });
    expect(props.safeParse({ ...input, group: "sections" }).success).toBe(false);
    const flat = { ...input, group: "none" };
    const html = renderInstance("Agenda", flat, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(html).not.toContain("home/c1/r1/date");
    const read = readComponent(agenda, flat, "a1").join("\n");
    expect(read).not.toContain("Fri 20 Nov");
    expect(read).toContain("[a1/r1 press]");
  });
});

describe("Agenda grouping and conflicts", () => {
  it("flags only exact-time, same-date overlaps with common attendees or everyone", () => {
    const variant = (title: string, who: string[], time?: string) => ({ title, who, time });
    const events = [
      event,
      variant("Shared", ["sam", "Alex"], "09:00"),
      variant("Unrelated", ["Mia"], "09:00"),
      variant("All day", ["Sam"]),
      variant("All day too", ["Everyone"]),
      variant("Whole family", ["Everyone"], "10:00"),
      variant("Same hour", ["Mia"], "10:00"),
    ];
    const later = [{ date: "2026-11-21", events: [event] }];
    const parsed = props.parse({
      ...input,
      days: [...later, { date, events: events.slice(0, 4) }, { date, events: events.slice(4) }],
    });
    expect(entriesOf(parsed).map(({ conflict }) => conflict)).toEqual([
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      false,
    ]);
    expect(entriesOf(parsed)[0]?.date).toBe(date);
  });
});

describe("Agenda read/act", () => {
  it("reads the same grouped headings, events, and actions as the filled screen", () => {
    const filled = readComponent(agenda, examples[0], "a1").join("\n");
    expect(filled).toContain("Fri 20 Nov");
    expect(filled).toContain("Sat 21 Nov");
    expect(filled).toContain("r1 09:00 Visit the garden centre · Sam, Mia (S, M)");
    expect(filled).toContain("r2 All day Bring the fern inside");
    expect(filled).toContain("[a1/add press→add_event]");
    expect(filled).toContain("[a1/r1 press]");
    expect(readComponent(agenda, examples[1], "a1").join("\n")).toContain("Everyone · Time conflict");
    expect(readComponent(agenda, examples[0], "a1", "empty")).toEqual(["a1 Agenda (empty)"]);
  });

  it("presses event roots without navigation and sends only Add to its destination", () => {
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta.parts).toEqual(["root", "empty", "add"]);
    expect(meta.items.parts).toEqual(
      expect.arrayContaining(["root", "date", "time", "title", "who", "conflict"]),
    );
    const parsed = stampItemIds(meta, props.parse(input));
    expect(affordancesOf(meta, parsed, "a1")).toEqual([
      { address: "a1/add", part: "add", action: "press", detail: "→add_event" },
      { address: "a1/r1", part: "root", action: "press", detail: "" },
    ]);
    const screen = { id: "week", components: [{ id: "a1", c: "Agenda", ...input }] };
    const act = (address: string) => planAct(screen, components, {}, [{ address, action: "press" }]);
    expect(act("week/a1/r1/root")).toMatchObject({ ok: true, links: [] });
    expect(act("week/a1/add")).toMatchObject({
      ok: true,
      links: [{ address: "week/a1/add", goto: "add_event" }],
    });
    expect(act("week/a1/r1/who")).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

describe("Agenda states and rendered parts", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  it("renders one heading per day, all-day time, conflict copy and attendee labels", () => {
    const html = renderInstance("Agenda", examples[0], "filled", theme);
    expect(elementAt(html, "home/c1/r1/date")).toBeDefined();
    expect(html).not.toContain('data-testid="home/c1/r2/date"');
    expect(elementAt(html, "home/c1/r3/date")).toBeDefined();
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="button"');
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain("Sam, Mia (S, M)");
    expect(elementAt(html, "home/c1/r1/who")).toBeDefined();
    expect(elementAt(html, "home/c1/r2/time")).toBeDefined();
    expect(html).toContain("All day");
    const conflict = renderInstance("Agenda", examples[1], "filled", theme);
    expect(elementAt(conflict, "home/c1/r1/conflict")).toBeDefined();
    expect(elementAt(conflict, "home/c1/r2/conflict")).toBeDefined();
    expect(elementAt(conflict, "home/c1/r2/who")).toBeDefined();
    expect(conflict).not.toContain('data-testid="home/c1/r3/conflict"');
    const max = renderInstance("Agenda", withEvent({ ...event, who: ["A", "B", "C", "D"] }), "filled", theme);
    expect(max).toContain("A, B, C, D");
  });

  it("keeps the empty root mounted and hides all event and add actions", () => {
    const html = renderInstance("Agenda", examples[0], "empty", theme, "entry");
    expect(elementAt(html, "home/c1/root")).toBeDefined();
    expect(elementAt(html, "home/c1/empty")).toBeDefined();
    expect(html).toContain(emptyLine("entry"));
    expect(html).not.toContain('role="button"');
  });
});
