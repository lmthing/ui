import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  packReady,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Library;
const { props, meta, examples, fallback, probes } = def;
const grid = props.parse(examples[0]!);
const item = grid.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "l1", c: "Library", ...grid }] };
const prefix = "home/c1/";

describe("Library schema boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("defaults and trims, and accepts exact limits and both ends of progress", () => {
    expect(props.parse({ items: [{ ...item, title: "  Fern  ", progress: 0 }] })).toMatchObject({
      aspect: "square",
      detail: "full",
      items: [{ title: "Fern", progress: 0 }],
    });
    const max = {
      title: "t".repeat(32),
      by: "b".repeat(24),
      photo: "local:1",
      progress: 1,
      badge: "n".repeat(8),
      goto: "d".repeat(64),
    };
    expect(props.safeParse({ items: Array.from({ length: 12 }, () => max) }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 13 }, () => item) },
    { ...grid, aspect: "wide" },
    { ...grid, detail: "none" },
    { ...grid, density: "spacious" },
    { ...grid, color: "red" },
    { ...grid, style: "masonry" },
    ...[
      { title: " " },
      { title: "t".repeat(33) },
      { by: "b".repeat(25) },
      { photo: "https://example.org/image.png" },
      { photo: undefined },
      { progress: -0.01 },
      { progress: 1.01 },
      { progress: Infinity },
      { progress: "42%" },
      { badge: "n".repeat(9) },
      { status: "loaned" },
      { dueLabel: "d".repeat(25) },
      { goto: "Bad ID" },
      { goto: undefined },
      { id: "r1" },
      { pixels: 4 },
    ].map((patch) => ({ items: [{ ...item, ...patch }] })),
  ])("rejects invalid wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Library metadata, probes and fallback", () => {
  it("keeps the pack gate, core near miss, detail write and read address", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true, weight: 3 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(probes.filter((probe) => probe.kind === "choose").map(({ expect }) => expect)).toEqual([
      "Library",
      "Gallery",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "Library",
        variant: expect.objectContaining({ axis: "detail", value: "brief" }),
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "l1/r2", action: "press" } }),
    );
  });

  it("uses up to four bounded cast titles and their cover reference", () => {
    const cast: CastLike = {
      things: [{ type: "recording", fields: ["name"] }],
      items: Array.from({ length: 5 }, (_, i) => ({
        id: `recording_${i}`,
        type: "recording",
        sample: true,
        name: i ? "t".repeat(80) : "Morning reading",
      })),
    };
    const input = fallback({ cast });
    expect(input.items).toHaveLength(4);
    expect(input.items[0]).toEqual({ title: "Morning reading", photo: "lib:recording", goto: "details" });
    expect(props.safeParse(input).success).toBe(true);
  });

  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "item", type: "invalid kind", sample: true, name: 7 }] },
  ])("uses a neutral cover when the cast has no usable title or reference", (cast) => {
    const input = fallback({ cast });
    expect(input.items).toEqual([{ title: placeholderTitle(0), photo: "lib:item", goto: "details" }]);
    expect(props.safeParse(input).success).toBe(true);
  });
});

describe("Library states and parts", () => {
  it("renders two named links and only draws supplied optional parts", () => {
    const html = renderInstance(
      "Library",
      {
        items: [
          { ...item, progress: 0 },
          { title: "Window Garden", photo: "lib:fern", goto: "window_garden" },
        ],
      },
      "filled",
      theme,
    );
    const addresses = addressedElements(html);
    for (const part of ["root", "title", "by", "photo", "progress", "badge"])
      expect(addresses.has(`${prefix}r1/${part}`)).toBe(true);
    for (const part of ["by", "progress", "badge", "status", "due_label"])
      expect(addresses.has(`${prefix}r2/${part}`)).toBe(false);
    expect(elementAt(html, `${prefix}r1/root`).attributes).toContain('role="link"');
    expect(elementAt(html, `${prefix}r2/root`).attributes).toContain('aria-label="Window Garden"');
    expect(html).toContain("0%");
  });

  it("hides only the byline part and text when brief, retaining the tile address", () => {
    const brief = { ...grid, detail: "brief" };
    const full = addressedElements(renderInstance("Library", grid, "filled", theme));
    const reduced = addressedElements(renderInstance("Library", brief, "filled", theme));
    expect([...reduced.keys()]).toEqual([...full.keys()].filter((address) => !address.endsWith("/by")));
    expect(readComponent(def, brief, "l1").join("\n")).not.toContain(item.by);
  });

  it.each(["empty", "loading"] as const)("draws %s without offering tile navigation", (state) => {
    const html = renderInstance("Library", grid, state, theme, "recording");
    expect(addressedElements(html).has(`${prefix}root`)).toBe(true);
    expect(html).toContain(state === "empty" ? emptyLine("recording") : loadingLabel);
    expect(html).not.toContain('role="link"');
    expect(readComponent(def, grid, "l1", state).join("\n")).not.toContain("l1/r1");
    const runtime = createScreenController({
      screen: { ...screen, components: [{ ...screen.components[0]!, state }] },
      defs: components,
    });
    expect(runtime.act({ address: "l1/r1", action: "press" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("Library read and act", () => {
  it("reads progress and navigates at the tile root, not at a decorative part", () => {
    const reading = readComponent(def, grid, "l1").join("\n");
    expect(reading).toContain("Fern Shelf · Progress: 42%");
    expect(reading).toContain("2 new");
    expect(reading).toContain("[l1/r2 press→window_garden]");
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onLink });
    for (const part of ["photo", "title", "by", "progress", "badge"])
      expect(runtime.act({ address: `l1/r1/${part}`, action: "press" })).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.act({ address: "home/l1/r2", action: "press" })).toMatchObject({ ok: true });
    expect(onLink.mock.calls[0]?.[0]).toBe("window_garden");
  });
});
