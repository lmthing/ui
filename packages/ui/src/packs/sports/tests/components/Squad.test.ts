import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Squad;
const { meta, props, examples, fallback, probes } = def;
const full = examples[0]!;
const seed = full.players[0]!;
const address = (part: string) => `home/s1/${part}`;
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance(
    "Squad",
    input,
    state,
    { preset: "calm", mode: "light", accent: "moss" },
    { component: "s1" },
  );

describe("Squad schema and bounds", () => {
  it.each(examples)("accepts each domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("trims names and stamps IDs only for the renderer", () => {
    expectTypeOf<Props<typeof props, typeof meta>["players"][number]["id"]>().toEqualTypeOf<string>();
    expect(
      props.parse({ needed: 20, players: Array(20).fill({ ...seed, name: ` ${"x".repeat(20)} ` }) }),
    ).toMatchObject({
      coach: false,
      detail: "full",
      players: Array(20).fill({ ...seed, name: "x".repeat(20) }),
    });
  });
  // prettier-ignore
  it.each([
    {}, { ...full, needed: 0 }, { ...full, needed: 21 }, { ...full, players: [] },
    { ...full, players: Array(21).fill(seed) }, { ...full, color: "red" },
    { ...full, detail: "quiet" }, ...[
      { name: " " }, { name: "x".repeat(21) }, { reason: "x".repeat(25) },
      { photo: "https://example.com/avatar.jpg" }, { answer: "unknown" }, { id: "r1" },
    ].map((patch) => ({ ...full, players: [{ ...seed, ...patch }] })),
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Squad fallback and metadata", () => {
  it("uses cast names and falls back to neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const item = { id: "one", type: "player", sample: true, name: "x".repeat(30) };
    const cast = { things: [{ type: "player", fields: ["name"] }], items: [item] };
    const malformed = { ...cast, items: [{ ...item, name: 42 }] };
    for (const candidate of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: candidate })).success).toBe(true);
    expect(fallback({ cast: empty }).players[0]?.name).toBe(placeholderTitle(0));
    expect(fallback({ cast }).players[0]?.name).toBe("x".repeat(20));
    expect(fallback({ cast: malformed }).players[0]?.name).toBe(placeholderTitle(0));
  });
  it("retains its shared-app tier, dense limits, pack gate and core-first probes", () => {
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3 });
    expect(createRegistry({ packs: ["sports"] }).ids.includes("Squad")).toBe(packReady("sports"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Squad",
      "People",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r1/answer", action: "select" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r2/picked", action: "check" } }),
      ]),
    );
  });
});

describe("Squad parts, states and reading", () => {
  it("shows availability, the first player's choices and separate coach checks", () => {
    const html = render(full);
    const parts = addressedElements(html);
    expect(parts.has(address("available"))).toBe(true);
    expect(html).toContain("1 of 5");
    expect(parts.get(address("r1/answer"))?.attributes).toContain('role="radiogroup"');
    expect(parts.get(address("r2/answer"))?.text).toContain("Yes");
    expect(parts.get(address("r3/reason"))?.text).toContain("Waiting on a lift");
    expect(parts.get(address("r2/picked"))?.attributes).toContain('role="checkbox"');
    expect(parts.has(address("r2/photo"))).toBe(true);
    expect(parts.has(address("r2/name"))).toBe(true);
    expect(parts.has(address("r2/root"))).toBe(true);
  });
  it("hides reasons only in brief detail, preserves their data and keeps addresses in compact", () => {
    const brief = { ...full, detail: "brief" };
    const base = addressedElements(render(full));
    expect([...addressedElements(render({ ...full, density: "compact" })).keys()]).toEqual([...base.keys()]);
    expect([...base.keys()].filter((key) => !addressedElements(render(brief)).has(key))).toEqual([
      address("r3/reason"),
    ]);
    expect(props.parse(brief).players[2]?.reason).toBe("Waiting on a lift");
    expect(readComponent(def, brief, "s1").join("\n")).not.toContain("Waiting on a lift");
  });
  it("renders a neutral, inert empty state", () => {
    expect([...addressedElements(render(full, "empty")).keys()]).toEqual([address("root"), address("empty")]);
    expect(readComponent(def, full, "s1", "empty").join("\n")).not.toMatch(/Ella|select|check/);
  });
});

describe("Squad read and act", () => {
  it("accepts only offered values on the first answer and limits picks to coaches", () => {
    const act = (part: string, action: string, value?: string, coach = true, state: StateName = "filled") =>
      planAct({ id: "home", components: [{ ...full, c: "Squad", id: "s1", state, coach }] }, components, {}, [
        { address: address(part), action, ...(value === undefined ? {} : { value }) },
      ]);
    expect(act("r1/answer", "select", "yes")).toMatchObject({ ok: true });
    expect(act("r1/answer", "select", "none")).toMatchObject({ ok: false });
    expect(act("r2/answer", "select", "yes")).toMatchObject({ ok: false });
    expect(act("r2/picked", "check")).toMatchObject({ ok: true });
    expect(act("r2/picked", "check", undefined, false)).toMatchObject({ ok: false });
    expect(act("r1/answer", "select", "yes", true, "empty")).toMatchObject({ ok: false });
    const viewing = readComponent(def, { ...full, coach: false }, "s1").join("\n");
    expect(viewing).toContain("s1/r1/answer select");
    expect(viewing).not.toContain("/picked check");
  });
});
