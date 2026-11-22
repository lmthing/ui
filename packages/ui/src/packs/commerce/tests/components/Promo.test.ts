import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { z } from "zod";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.Promo;
const { props, meta, fallback, examples, probes } = def;
const offer = examples[0]!;
const simple = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const prefix = "home/c1/";
const copy = { address: "p1/code", action: "press" };
const open = { address: "p1", action: "press" };

function screenWith(input: z.input<typeof props>) {
  return { id: "home", components: [{ id: "p1", c: "Promo", ...input }] };
}

describe("Promo schema and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("trims text, resolves default variants and accepts the exact field limits", () => {
    expect(props.parse({ ...offer, title: "  Offer  ", code: " CODE " })).toMatchObject({
      title: "Offer",
      code: "CODE",
      has_code: true,
      emphasis: "normal",
      media: "thumb",
    });
    expect(
      props.safeParse({
        ...offer,
        title: "a".repeat(36),
        code: "A".repeat(12),
        goto: "a".repeat(64),
        photo: "local:1",
      }).success,
    ).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["title"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    ...[
      { title: " " },
      { title: "x".repeat(37) },
      { code: "" },
      { code: "X".repeat(13) },
      { ends: "2026-02-30" },
      { photo: "https://example.org/photo.png" },
      { photo: `lib:${"x".repeat(65)}` },
      { goto: undefined },
      { goto: "Bad ID" },
      { goto: "a".repeat(65) },
      { media: "icon" },
      { density: "wide" },
      { emphasis: "hero" },
      { surface: "plain" },
      { color: "red" },
      { pixels: 4 },
      { has_code: true },
    ].map((patch) => ({ ...offer, ...patch })),
  ])("rejects invalid wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Promo fallback", () => {
  it("uses a bounded cast title rather than inventing an offer", () => {
    const cast: CastLike = {
      things: [{ type: "offer", fields: ["label"] }],
      items: [{ id: "offer_one", type: "offer", sample: true, label: "x".repeat(80) }],
    };
    const input = fallback({ cast });
    expect(input.title).toHaveLength(36);
    expect(input).toEqual({ title: expect.stringMatching(/^x+/), goto: "detail" });
    expect(props.safeParse(input).success).toBe(true);
  });

  it("uses a neutral title for empty and malformed casts", () => {
    for (const items of [[], [{ id: "item", type: "offer", sample: true, title: 4 }]]) {
      const input = fallback({ cast: { things: [], items } });
      expect(input).toEqual({ title: "Item one", goto: "detail" });
      expect(props.safeParse(input).success).toBe(true);
    }
  });
});

describe("Promo contract and probes", () => {
  it("declares only the filled state, phone tier, and non-destructive actions", () => {
    expect(meta).toMatchObject({ status: "ready", states: ["filled"], tier: "phone", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
  });

  it("keeps the core near miss, all writes and the code read action", () => {
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Promo",
      "Banner",
    ]);
    expect(probes.filter((probe) => probe.kind === "write").map((probe) => probe.expect)).toEqual([
      "Promo",
      "Promo",
      "Promo",
      "Promo",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
    );
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: copy }));
  });
});

describe("Promo filled state and parts", () => {
  it("draws all supplied parts and keeps the copy button outside the offer link", () => {
    const html = renderInstance("Promo", offer, "filled", theme, { lang: "en-US" });
    const link = elementAt(html, `${prefix}root`);
    expect(link.attributes).toContain('role="link"');
    const button = elementAt(html, `${prefix}code`);
    expect(button.attributes).toContain('role="button"');
    expect(button.attributes).toContain('aria-label="Copy FERN20"');
    expect(JSON.stringify(link.children)).not.toContain(`${prefix}code`);
    expect([...addressedElements(html).keys()].sort()).toEqual(
      meta.parts
        .filter((part) => part !== "countdown")
        .map((part) => prefix + part)
        .sort(),
    );
    expect(html).toContain("ends · Nov 30, 2026");
  });

  it("omits absent parts and hides only the photo in media none", () => {
    const drawn = (input: z.input<typeof props>) =>
      addressedElements(renderInstance("Promo", input, "filled", theme));
    expect([...drawn(simple).keys()]).toEqual([`${prefix}offer`, `${prefix}root`, `${prefix}title`]);
    const hidden = { ...offer, media: "none" } as const;
    expect([...drawn(hidden).keys()]).toEqual(
      [...drawn(offer).keys()].filter((id) => id !== `${prefix}photo`),
    );
  });
});

describe("Promo read and act", () => {
  it("reads localized expiry and separates the copy command from navigation", () => {
    const line = readComponent(def, offer, "p1", "filled", {}, "en-US").join("\n");
    expect(line).toContain("ends · Nov 30, 2026");
    expect(line).toContain("Copy FERN20");
    expect(line).toContain("[p1 press→fern_offer]");
    expect(line).toContain("[p1/code press]");
    expect(readComponent(def, simple, "p1").join("\n")).not.toMatch(/ends|p1\/code/);
  });

  it("routes copy to the host without navigating and routes open to the offer", () => {
    const onAction = vi.fn();
    const onLink = vi.fn();
    const runtime = createScreenController({ screen: screenWith(offer), defs: components, onAction, onLink });
    expect(runtime.act(copy)).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ ...copy, address: "home/p1/code" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.act(open)).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith("fern_offer", "home/p1");
  });

  it("rejects copy when no code is present and never offers a press on the expiry line", () => {
    expect(planAct(screenWith(simple), components, {}, [copy])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(planAct(screenWith(offer), components, {}, [{ ...copy, address: "p1/ends" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});
