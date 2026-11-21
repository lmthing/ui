import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  wordsFor,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Highlights;
const sample = examples[0]!;
const item = props.parse(sample).items[0]!;
const theme = { preset: "calm", accent: "moss", mode: "light" } as const;
const prefix = "home/c1";

describe("Highlights schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims text and accepts the exact bounds on each field", () => {
    const max = {
      text: "t".repeat(240),
      from: "f".repeat(36),
      at: "1".repeat(12),
      note: "n".repeat(120),
      goto: "s".repeat(64),
    };
    const items = [{ ...max, text: ` ${max.text} ` }, ...Array(5).fill(max)];
    expect(props.parse({ items })).toMatchObject({
      surface: "card",
      detail: "full",
      items: Array(6).fill(max),
    });
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  // prettier-ignore
  it.each([
    { text: "" }, { text: "t".repeat(241) }, { from: "  " }, { from: "f".repeat(37) },
    { at: "" }, { at: "1".repeat(13) }, { note: "  " }, { note: "n".repeat(121) },
    { goto: undefined }, { goto: "s".repeat(65) }, { goto: "Not a screen" },
    { id: "r1" }, { color: "red" },
  ])("rejects invalid item fields: %j", (patch) => {
    expect(props.safeParse({ items: [{ ...item, ...patch }] }).success).toBe(false);
  });

  it.each([
    {},
    { items: [] },
    { items: Array(7).fill(item) },
    { ...sample, surface: "raised" },
    { ...sample, detail: "short" },
    { ...sample, density: "tiny" },
    { ...sample, color: "red" },
  ])("rejects invalid component props: %j", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Highlights fallback and metadata", () => {
  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "a", type: "recording", title: 4, sample: false }] },
  ])("uses neutral placeholders without usable cast data", (cast) => {
    expect(props.parse(fallback({ cast, lang: "en" })).items).toEqual([
      { text: wordsFor("en").placeholderDetail, from: placeholderTitle(0, "en"), goto: "details" },
    ]);
  });

  it("uses the cast field order, clips long copy and limits the fallback to three items", () => {
    const cast: CastLike = {
      things: [{ type: "recording", fields: ["name", "description"] }],
      items: Array.from({ length: 4 }, (_, index) => ({
        id: `s${index}`,
        type: "recording",
        sample: true,
        name: "t".repeat(40),
        description: "d".repeat(250),
      })),
    };
    expect(props.parse(fallback({ cast })).items).toEqual(
      Array(3).fill({ from: "t".repeat(36), text: "d".repeat(240), goto: "details" }),
    );
  });

  it("preserves the phone tier, pack gate and choose/write/read contract", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", region: "body", weight: 2 });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect: id }) => id)).toEqual([
      "Highlights",
      "List",
    ]);
    expect(probes.filter(({ kind }) => kind === "write")).toEqual([
      expect.objectContaining({ expect: "Highlights" }),
      expect.objectContaining({ expect: "Highlights", variant: { axis: "detail", value: "brief" } }),
    ]);
    expect(probes.find(({ kind }) => kind === "read")).toMatchObject({
      expect: { address: "h1/r1", action: "press" },
    });
  });
});

describe("Highlights states and parts", () => {
  it("renders the same filled addresses across finishes and omits absent or hidden details", () => {
    const input = { items: [item, { text: "Another passage", from: "Another source", goto: "second" }] };
    for (const [finish, note] of [
      [{}, true],
      [{ density: "compact", surface: "plain" }, true],
      [{ detail: "brief" }, false],
    ] as const) {
      const parts = addressedElements(renderInstance("Highlights", { ...input, ...finish }, "filled", theme));
      expect([...parts.keys()].sort()).toEqual(
        [
          "root",
          "r1/root",
          "r1/text",
          "r1/from",
          "r1/at",
          ...(note ? ["r1/note"] : []),
          "r2/root",
          "r2/text",
          "r2/from",
        ]
          .map((part) => `${prefix}/${part}`)
          .sort(),
      );
      expect(parts.get(`${prefix}/r1/root`)?.attributes).toContain('role="link"');
      expect(parts.get(`${prefix}/r1/text`)?.text).toEqual([`“${item.text}”`]);
      expect(parts.get(`${prefix}/r1/from`)?.text).toEqual([item.from]);
      expect(parts.get(`${prefix}/r1/at`)?.text).toEqual([item.at]);
    }
  });

  it("uses an addressed empty message with no excerpt or link", () => {
    expect(meta.states).toEqual(["filled", "empty"]);
    for (const thing of [undefined, "highlight"]) {
      const html = renderInstance("Highlights", sample, "empty", theme, thing);
      const parts = addressedElements(html);
      expect([...parts.keys()]).toEqual([`${prefix}/root`, `${prefix}/empty`]);
      expect(parts.get(`${prefix}/empty`)?.text).toEqual([emptyLine(thing)]);
      expect(html).not.toContain('role="link"');
    }
  });
});

describe("Highlights read and act", () => {
  it.each(["filled", "empty"] as const)("exposes source links only when %s", (state) => {
    const onLink = vi.fn(),
      onAction = vi.fn();
    const screen = { id: "home", components: [{ ...sample, id: "c1", c: "Highlights", state }] };
    const runtime = createScreenController({ screen, defs: components, onLink, onAction });
    if (state === "empty") {
      expect(runtime.read()).not.toContain("[c1/r1 press");
      expect(runtime.press("c1/r1")).toMatchObject({ ok: false });
      expect(onLink).not.toHaveBeenCalled();
      expect(onAction).not.toHaveBeenCalled();
      return;
    }
    expect(runtime.read()).toContain(`“${item.text}”`);
    expect(runtime.read()).toContain(item.note);
    expect(runtime.read()).toContain(`[c1/r1 press→${item.goto}]`);
    for (const part of ["text", "from", "at", "note"])
      expect(runtime.press(`c1/r1/${part}`)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(runtime.press("c1/r1")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith(item.goto, `${prefix}/r1`);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `${prefix}/r1`, action: "press" });
  });

  it("does not read hidden notes or change the source action", () => {
    const screen = { id: "home", components: [{ ...sample, id: "c1", c: "Highlights", detail: "brief" }] };
    const runtime = createScreenController({ screen, defs: components });
    expect(runtime.read()).not.toContain(item.note);
    expect(runtime.read()).toContain(item.at);
    expect(runtime.actionsAt("c1/r1")).toEqual(["press"]);
  });
});
