import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readScreen,
  type StateName,
} from "@lmthing/ui/catalog";

const { Sessions } = components;
const { props, meta, examples, fallback, probes } = Sessions;
type Input = ReturnType<typeof fallback>;
const example: Input = examples[0]!;
const first = example.sessions[0]!;
const defs = { Sessions };
const screen = (input: Input = example, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "Sessions", state }],
});
const filter = (value: string) => ({ address: "s1/track", action: "select", value });

describe("Sessions draft contract", () => {
  it.each(examples)("parses the domain examples", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("stays discoverable in the draft registry with the intended core-first probes", () => {
    const packs = ["events"] as const;
    expect(createRegistry({ packs, includeDrafts: true }).ids.includes("Sessions")).toBe(true);
    expect(createRegistry({ packs }).ids.includes("Sessions")).toBe(packReady("events"));
    expect(meta).toMatchObject({ tier: "phone", weight: 3, dense: true });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timeline" }));
  });
  it("uses cast titles and neutral room and track labels", () => {
    const empty = { things: [], items: [] };
    const cast = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "one", type: "record", label: "  Meet the artists  ", sample: true }],
    };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, label: 9 }] };
    for (const input of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: input })).success).toBe(true);
    expect(fallback({ cast }).sessions[0]).toMatchObject({ title: "Meet the artists" });
    expect(fallback({ cast: empty }).sessions[0]).toMatchObject({
      title: placeholderTitle(0),
      track: placeholderTitle(0),
      room: placeholderTitle(1),
    });
  });
});

describe("Sessions schema bounds", () => {
  // prettier-ignore
  it.each([
    { tracks: [] }, { tracks: Array(7).fill("A") }, { tracks: ["Main stage", " Main stage "] },
    { tracks: ["x".repeat(17)] }, { sessions: [] }, { sessions: Array(25).fill(first) },
    { sessions: [first, { ...first, id: ` ${first.id} ` }] }, { selectedTrack: "Unknown" },
    { style: "all" }, { color: "red" }, { activeTrack: "all" },
  ])("rejects invalid collections %o", (fields) => expect(props.safeParse({ ...example, ...fields }).success).toBe(false));
  // prettier-ignore
  it.each([
    { id: "x".repeat(25) }, { title: "x".repeat(33) }, { room: "x".repeat(21) }, { speaker: "x".repeat(25) },
    { track: "Unknown" }, { start: "09:5" }, { end: "09:00" }, { end: "24:00" }, { goto: "not a route" },
    { booked: -1 }, { booked: 1.5 }, { booked: 6, capacity: 5 }, { capacity: Infinity },
    { saved: "yes" }, { conflict: true }, { remaining: 5 },
  ])("rejects invalid rows %o", (fields) =>
    expect(props.safeParse({ ...example, sessions: [{ ...first, ...fields }] }).success).toBe(false));
  it("accepts 24 unique sessions and six tracks with maximal text lengths", () => {
    const tracks = Array.from({ length: 6 }, (_, n) => `${n}${"x".repeat(15)}`);
    const sessions = Array.from({ length: 24 }, (_, n) => ({
      ...first,
      id: `${"x".repeat(22)}${String(n).padStart(2, "0")}`,
      title: "x".repeat(32),
      room: "x".repeat(20),
      speaker: "x".repeat(24),
      track: tracks[n % tracks.length]!,
    }));
    expect(props.safeParse({ tracks, sessions }).success).toBe(true);
  });
});

describe("Sessions draft read and act", () => {
  it("filters by track and clears the filter without renumbering the linked row", () => {
    const source = screen({ ...example, selectedTrack: "Workshops" });
    const initial = readScreen(source, defs);
    expect(initial).toContain('[s1/track select = "Workshops"');
    expect(initial).toContain("[s1/r2/save toggle:on]");
    expect(initial).not.toContain("Opening keynote");
    expect(planAct(source, defs, {}, [filter("Unknown")], null)).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    const cleared = planAct(source, defs, {}, [filter("All tracks")], null);
    if (!cleared.ok) throw new Error(JSON.stringify(cleared));
    expect(readScreen(source, defs, cleared.values)).toContain("[s1/r1 press→keynote]");
    expect(readScreen(source, defs, cleared.values)).not.toMatch(/\[s1\/r[23] press/);
  });
  it("does not offer a track action in a personal agenda or any actions while loading", () => {
    const reading = readScreen(screen(examples[1]!), defs);
    expect(reading).not.toContain("[s1/track select");
    expect(reading).toContain("Time conflict");
    expect(reading).not.toContain("Meet the crew");
    expect(readScreen(screen(example, "loading"), defs)).not.toContain("[s1/");
  });
});
