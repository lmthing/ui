import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  packReady,
  planAct,
  readScreen,
  stampItemIds,
  wordsFor,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, expectTypeOf, it } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";

const def = components.ActivityLog;
const { meta, props, examples, fallback, probes } = def;
const ledge = examples[0]!;
const first = ledge.entries[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = { ActivityLog: def };
const screen = (input: object = ledge, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "ActivityLog", state }],
});

describe("ActivityLog schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));

  it.each([
    {},
    { entries: [] },
    { entries: Array(7).fill(first) },
    { entries: [{ ...first, who: "x".repeat(21) }] },
    { entries: [{ ...first, text: "x".repeat(81) }] },
    { entries: [{ ...first, time: "x".repeat(13) }] },
    { entries: [{ ...first, time: " " }] },
    { entries: [{ ...first, photo: "https://example.org/photo" }] },
    { entries: [{ ...first, photo: undefined }] },
    { entries: [{ ...first, goto: "not a screen id" }] },
    { entries: [{ ...first, goto: undefined }] },
    { entries: [{ ...first, id: "r1" }] },
    { entries: [{ ...first, danger: true }] },
    { ...ledge, density: "tight" },
    { ...ledge, surface: "tinted" },
    { ...ledge, lead: "icon" },
    { ...ledge, color: "red" },
  ])("rejects an invalid wire input", (input) => expect(props.safeParse(input).success).toBe(false));

  it("accepts exact limits and applies the default axes, without wire item ids", () => {
    const entry = {
      who: "A".repeat(20),
      text: "a".repeat(80),
      time: "t".repeat(12),
      photo: "local:1",
      goto: "a".repeat(64),
    };
    expect(props.parse({ entries: Array(6).fill(entry) })).toMatchObject({
      surface: "card",
      lead: "avatar",
      entries: Array(6).fill(entry),
    });
    expect(props.parse({ entries: [{ ...first, who: ` ${first.who} ` }] }).entries[0]?.who).toBe(first.who);
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("ActivityLog fallback and probes", () => {
  it("uses bounded cast content and shared neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const item = { id: "ana", type: "actor", sample: true, name: "Ana", note: "Changed the record." };
    const cast: CastLike = {
      things: [{ type: "actor", fields: ["name", "note"] }],
      items: [item],
    };
    const malformed: CastLike = { ...cast, items: [{ ...item, name: 4, note: false }] };
    const large: CastLike = {
      ...cast,
      items: Array.from({ length: 8 }, (_, i) => ({
        ...item,
        id: `actor_${i}`,
        name: "x".repeat(40),
        note: "y".repeat(100),
      })),
    };
    for (const source of [empty, cast, malformed, large])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast }).entries[0]).toMatchObject({ who: "Ana", text: "Changed the record." });
    expect(fallback({ cast: malformed })).toEqual(fallback({ cast: empty }));
    expect(fallback({ cast: empty }).entries).toEqual([
      {
        who: "Item one",
        text: wordsFor().placeholderDetail,
        photo: "lib:people",
        time: wordsFor().placeholderValue,
        goto: "detail",
      },
    ]);
    expect(fallback({ cast: large }).entries).toHaveLength(6);
  });

  it("retains the core near miss, non-finish write probe, and non-destructive people tier", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "people", weight: 2, region: "body" });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes.slice(0, 5)).toMatchObject([
      { kind: "choose", expect: "ActivityLog" },
      { kind: "choose", expect: "Timeline" },
      { kind: "write", expect: "ActivityLog" },
      { kind: "write", variant: { axis: "lead", value: "none" } },
      { kind: "read", expect: { address: "s1/r2", action: "press" } },
    ]);
    expect(createRegistry({ packs: ["data"] }).ids.includes("ActivityLog")).toBe(packReady("data"));
  });
});

describe("ActivityLog states and parts", () => {
  it("draws each actual audit entry as one link, with separate content parts", () => {
    const image = "data:image/png;base64,AA==";
    const input = { entries: [first, { ...ledge.entries[1]!, photo: "local:1" }] };
    const html = renderInstance("ActivityLog", input, "filled", theme, { resolvePhoto: () => image });
    const parts = addressedElements(html);
    expect(parts.get("home/c1/r1/photo")?.children[0]?.text).toEqual(["A"]);
    expect(html).toContain(`src="${image}"`);
    expect(parts.has("home/c1/root")).toBe(true);
    ledge.entries.forEach(({ who, text, time }, index) => {
      const base = `home/c1/r${index + 1}`;
      expect(parts.get(`${base}/root`)?.attributes).toContain('role="link"');
      expect(parts.get(`${base}/photo`)?.attributes).toContain(`aria-label="${who}"`);
      expect(parts.get(`${base}/who`)?.text).toEqual([who]);
      expect(parts.get(`${base}/text`)?.text).toEqual([text]);
      expect(parts.get(`${base}/time`)?.text).toEqual([time]);
    });
    const variant = { ...input, lead: "none", surface: "outlined", density: "compact" };
    const alternates = addressedElements(renderInstance("ActivityLog", variant, "filled", theme));
    expect([...alternates.keys()]).toEqual([...parts.keys()].filter((part) => !part.endsWith("/photo")));
  });

  it.each(["empty", "loading"] as const)("omits entries and affordances while %s", (state) => {
    const html = renderInstance("ActivityLog", ledge, state, theme);
    expect([...addressedElements(html).keys()]).toEqual(
      state === "empty" ? ["home/c1/root", "home/c1/title"] : ["home/c1/root"],
    );
    expect(html).toContain(state === "empty" ? emptyLine() : 'aria-busy="true"');
    expect(visibleTexts(html)).not.toContain(first.text);
    expect(readScreen(screen(ledge, state), defs)).toContain(`s1 ActivityLog (${state})`);
    expect(readScreen(screen(ledge, state), defs)).not.toContain(" press");
    expect(planAct(screen(ledge, state), defs, {}, [{ address: "s1/r1", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("ActivityLog read and act", () => {
  it("reads the audit details in order and offers only the record links, with or without portraits", () => {
    for (const lead of ["avatar", "none"] as const) {
      const input = { ...ledge, lead };
      const parsed = stampItemIds(meta, props.parse(input));
      expect(affordancesOf(meta, parsed, "s1")).toEqual([
        { address: "s1/r1", part: "root", action: "press", detail: "→fern" },
        { address: "s1/r2", part: "root", action: "press", detail: "→rubber" },
      ]);
      const reading = readScreen(screen(input), defs);
      const photo = lead === "avatar" ? " · photo:people" : "";
      for (const { who, text, time } of ledge.entries)
        expect(reading).toContain(`"${who}"${photo} · "${text}" · "${time}"`);
      expect(reading.includes("photo:")).toBe(lead === "avatar");
      expect(reading).toContain("[s1/r2 press→rubber !needs-people]");
    }
  });

  it("navigates only on a valid row press and never asks for confirmation", () => {
    const links: string[] = [];
    const runtime = createScreenController({
      screen: screen(),
      defs,
      onLink: (goto) => {
        links.push(goto);
      },
    });
    try {
      for (const address of ["s1", "s1/r1/who", "s1/r1/photo", "s1/r1/text", "s1/r1/time", "s1/r3"])
        expect(runtime.press(address).ok).toBe(false);
      expect(runtime.act({ address: "s1/r1", action: "toggle" }).ok).toBe(false);
      expect(runtime.press("s1/r2").ok).toBe(true);
      expect(runtime.press("s1/r1/root").ok).toBe(true);
      expect(links).toEqual(["rubber", "fern"]);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
