import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Lineup;
const { props, examples, fallback, probes } = def;
const sample = examples[0]!;
const player = { number: 0, name: "a".repeat(16) };
const one = { players: [player] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/l1/${part}`;
const render = (input: unknown, state: StateName = "filled", lang = "en") =>
  addressedElements(renderInstance("Lineup", input, state, theme, { component: "l1", lang }));
const screenWith = (state: StateName) => ({
  id: "home",
  components: [{ ...sample, c: "Lineup", id: "l1", state }],
});

describe("Lineup schema and contract", () => {
  it.each(examples)("parses each domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );

  it("bounds every line, starter and substitute, and projects a stable flat lineup", () => {
    expect(props.parse(sample).players.map(({ number, line }) => [number, line])).toEqual([
      [1, 0],
      [4, 1],
      [8, 1],
      [10, 2],
      [11, 2],
      [14, undefined],
    ]);
    expect(props.parse({ lines: [one] })).toMatchObject({
      style: "pitch",
      surface: "card",
      detail: "full",
      subs: [],
    });
    expect(
      props.parse({
        lines: Array(5).fill({ players: Array(6).fill(player) }),
        subs: Array(7).fill({ ...player, number: 99 }),
      }).players,
    ).toHaveLength(37);
  });

  // prettier-ignore
  it.each([
    {}, { lines: [] }, { lines: [{ players: [] }] }, { lines: Array(6).fill(one) },
    { lines: [{ players: Array(7).fill(player) }] }, { lines: [one], subs: Array(8).fill(player) },
    { ...sample, style: "board" }, { ...sample, surface: "tinted" }, { ...sample, color: "#000" },
    { ...sample, players: [] }, { ...sample, detail: "none" },
    ...[{ number: -1 }, { number: 100 }, { number: 0.5 }, { number: "9" }, { name: " " },
      { name: "a".repeat(17) }, { id: "r9" }].map((patch) => ({ lines: [{ players: [{ ...player, ...patch }] }] })),
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Lineup fallback and metadata", () => {
  it("uses cast titles or neutral placeholders, including malformed casts", () => {
    const empty = { things: [], items: [] };
    const item = { id: "player", type: "entry", sample: true, name: "Green" };
    const cast = { things: [{ type: "entry", fields: ["name"] }], items: [item] };
    const malformed = { ...cast, items: [{ ...item, name: 10 }] };
    for (const candidate of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: candidate })).success).toBe(true);
    const neutral = [{ players: [{ number: 1, name: placeholderTitle(0) }] }];
    expect(fallback({ cast: empty }).lines).toEqual(neutral);
    expect(fallback({ cast: malformed }).lines).toEqual(neutral);
    expect(fallback({ cast }).lines[0]?.players[0]?.name).toBe("Green");
  });

  it("keeps the dense phone-tier contract, readiness gate and People near miss", () => {
    expect(def.meta).toMatchObject({ tier: "phone", dense: true });
    expect(createRegistry({ packs: ["sports"] }).ids.includes("Lineup")).toBe(packReady("sports"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Lineup",
      "People",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "Lineup" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "l1/r2", action: "press" } }),
      ]),
    );
  });
});

describe("Lineup drawing, reading and actions", () => {
  it.each(["pitch", "list"] as const)("addresses each starter and substitute in %s", (style) => {
    const keys = render({ ...sample, style }, "filled", "ar-EG");
    for (const part of def.meta.parts)
      expect(keys.has(address(part))).toBe(part !== "bench_list" || style === "list");
    ["Gardner", "Green", "Field", "Reed", "Woods", "Moss"].forEach((name, index) => {
      const root = `r${index + 1}`;
      expect(keys.get(address(`${root}/root`))?.attributes).toContain('role="button"');
      expect(keys.get(address(`${root}/name`))?.text).toContain(name);
      expect(keys.get(address(`${root}/number`))?.text).not.toHaveLength(0);
    });
    expect(keys.get(address("r2/number"))?.text).toContain("٤");
    expect(keys.get(address("r6/number"))?.text).toContain("١٤");
    expect(keys.get(address("shape"))?.text).toContain("١–٢–٢");
  });

  it("keeps the same addresses except the hidden summary and omits an absent bench", () => {
    const keys = render(sample);
    expect([...render({ ...sample, density: "compact", surface: "outlined" }).keys()]).toEqual([
      ...keys.keys(),
    ]);
    expect([...render({ ...sample, detail: "brief" }).keys()]).toEqual(
      [...keys.keys()].filter((key) => key !== address("shape")),
    );
    expect(render({ lines: [one] }).has(address("bench"))).toBe(false);
    const empty = render(sample, "empty");
    expect([...empty.keys()].sort()).toEqual(["formation", "root", "title"].map(address));
    expect(empty.get(address("formation"))?.text).toContain(emptyLine());
  });

  it("keeps reader text, localization and actions in step with the view", () => {
    const reading = readComponent(def, sample, "l1", "filled", {}, "ar-EG").join("\n");
    expect(reading).toContain("Starting lineup — ١–٢–٢");
    expect(reading).toContain("Substitutes");
    expect(reading).toContain("r6: Moss #١٤");
    const brief = readComponent(def, { ...sample, detail: "brief" }, "l1", "filled").join("\n");
    expect(brief).toContain("Moss");
    expect(brief).not.toContain("1–2–2");
    expect(readComponent(def, sample, "l1", "empty").join("\n")).not.toContain("Gardner");
    const act = (part: string, state: StateName = "filled", action = "press") =>
      planAct(screenWith(state), components, {}, [{ address: address(part), action }]);
    for (const part of ["r1", "r6"]) expect(act(part).ok).toBe(true);
    for (const part of ["root", "bench", "r7", "r6/name", "r1/number"]) expect(act(part).ok).toBe(false);
    expect(act("r1", "empty").ok).toBe(false);
    expect(act("r1", "filled", "toggle").ok).toBe(false);
    const onAction = vi.fn();
    const runtime = createScreenController({ screen: screenWith("filled"), defs: components, onAction });
    try {
      expect(runtime.press(address("r6/root")).ok).toBe(true);
      expect(onAction).toHaveBeenCalledWith({ address: address("r6"), action: "press" });
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
