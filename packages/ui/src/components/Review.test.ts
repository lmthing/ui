import { describe, expect, expectTypeOf, it, vi } from "vitest";
// prettier-ignore
import { affordancesOf, components, createRegistry, readComponent, reviewLabels, stampItemIds, type CastLike, type Props } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../test/render";
const { props, meta, examples, fallback, probes } = components.Review;
const summary = { average: 4.5, count: 4, bars: [0, 0, 0, 2, 2] };
const row = { stars: 5, name: "Alex", date: "2026-11-18", text: "Thoughtful service." };
const list = { style: "list", reviews: [row] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
// prettier-ignore
const invalidInputs = [
  {},
  { style: "list" },
  { ...summary, style: "grid" },
  { ...summary, color: "red" },
  ...[
    { average: -1 }, { average: 6 }, { average: Infinity }, { count: -1 }, { count: 0.5 },
    { bars: [0, 0, 0, 0] }, { bars: [0, 0, 0, 0, 0, 0] }, { bars: [-1, 0, 0, 0, 0] },
    { bars: [Infinity, 0, 0, 0, 0] }, { average: undefined }, { count: undefined }, { bars: undefined },
  ].map((invalid) => ({ ...summary, ...invalid })),
  { ...list, reviews: [] },
  { ...list, reviews: Array.from({ length: 6 }, () => row) },
  ...[
    { stars: 0 }, { stars: 6 }, { stars: 1.5 }, { name: "" }, { name: "   " }, { name: "a".repeat(25) },
    { text: "" }, { text: "a".repeat(241) }, { reply: "" }, { reply: "a".repeat(161) },
    { date: "2026-02-29" }, { id: "r1" }, { photos: [] }, { photos: Array(4).fill("lib:sample") },
    { photos: ["https://example.org/photo"] }, { fitScale: 0 }, { fitScale: 6 }, { fitScale: 2.5 },
    { spoiler: "true" }, { verified: 1 }, { expanded: true },
  ].map((invalid) => ({ ...list, reviews: [{ ...row, ...invalid }] })),
];
describe("Review schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults the summary and trims authored text", () => {
    expect(props.parse(summary)).toMatchObject({ style: "summary", reviews: [] });
    const parsed = props.parse({ ...list, reviews: [{ ...row, name: " Alex ", reply: " Thanks " }] });
    expect(parsed.reviews?.[0]).toMatchObject({ name: "Alex", reply: "Thanks" });
    type Row = NonNullable<Props<typeof props, typeof meta>["reviews"]>[number];
    expectTypeOf<Row["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
  });
  it.each(invalidInputs)("rejects invalid input", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts both rating endpoints and exact text and list limits", () => {
    for (const average of [0, 5])
      expect(props.safeParse({ average, count: 0, bars: [0, 0, 0, 0, 0] }).success).toBe(true);
    for (const stars of [1, 5])
      expect(
        props.safeParse({
          ...list,
          reviews: Array.from({ length: 5 }, () => ({
            stars,
            name: "a".repeat(24),
            date: "2024-02-29",
            text: "a".repeat(240),
            reply: "a".repeat(160),
          })),
        }).success,
      ).toBe(true);
    expect(props.safeParse({ ...summary, bars: [Number.MAX_VALUE, 0, 0, 0, 0] }).success).toBe(true);
  });
  it("discards inactive fields so the screen and reading agree", () => {
    const input = { ...summary, reviews: [row] };
    expect(props.parse(input).reviews).toEqual([]);
    expect(readComponent(components.Review, input, "r1").join("\n")).not.toContain(row.name);
    for (const part of ["average", "count", "bars"] as const)
      expect(props.parse({ ...input, style: "list" })[part]).toBeUndefined();
  });
});
describe("Review fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    },
    { things: [], items: [{ id: "bad", type: "thing", sample: false, name: 7 }] },
    {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "a".repeat(80), room: "b".repeat(300) }],
    },
  ];
  it.each(casts)("validates empty, full, malformed and overlong casts in both styles", (cast) => {
    const input = fallback({ cast });
    expect(props.safeParse(input).success).toBe(true);
    expect(props.safeParse({ ...input, style: "list" }).success).toBe(true);
  });
  it("uses only cast content and neutral empty placeholders", () => {
    expect(fallback({ cast: casts[0]! }).reviews?.[0]).toMatchObject({ name: "Item one", text: "Details" });
    expect(fallback({ cast: casts[1]! }).reviews?.[0]).toMatchObject({ name: "Fern", text: "Bathroom" });
    expect(fallback({ cast: casts[2]! }).reviews?.[0]?.name).toBe("Item one");
  });
  it("keeps core-first probes, declared states, people tier and the core registration", () => {
    expect(meta).toMatchObject({ tier: "people", states: ["filled", "empty"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Scale");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Scale")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Review" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      expect: { address: "r1/r1/reply", action: "press" },
    });
    expect(createRegistry({ includeDrafts: true }).ids).toContain("Review");
  });
});
describe("Review states and parts", () => {
  it("draws the average, count and five-bar summary with no interactive stars", () => {
    const html = renderInstance("Review", summary, "filled", theme);
    for (const part of ["root", "average", "count", "bars"])
      expect(html).toContain(`data-testid="home/c1/${part}"`);
    expect(html).not.toMatch(/data-testid="home\/c1\/(?:label|amount)"|role="radio"/);
    expect(html).toMatch(/>1 star<[\s\S]*>5 stars</);
    expect(affordancesOf(meta, props.parse(summary), "r1")).toEqual([]);
    const reading = readComponent(components.Review, summary, "r1").join("\n");
    for (const text of ["4.5 of 5", "4 reviews", "1 star 0", "5 stars 2"]) expect(reading).toContain(text);
    expect(
      renderInstance("Review", { average: 0, count: 0, bars: [0, 0, 0, 0, 0] }, "filled", theme),
    ).not.toContain("NaN");
  });
  // prettier-ignore
  it("draws verified, fit and photo parts only where supplied", () => {
    const reviews = [{ ...row, fitScale: 3, photos: ["lib:sample", "local:1", "lib:second"], verified: true }, row];
    const html = renderInstance("Review", { ...list, reviews }, "filled", theme);
    const parts = addressedElements(html);
    for (const part of ["verified", "fit", "photo_1", "photo_2", "photo_3"]) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
      expect(parts.has(`home/c1/r2/${part}`)).toBe(false);
    }
    expect(html).toContain("True to size");
  });
  it.each([undefined, "Thank you."])("offers a reply with or without an existing response: %s", (reply) => {
    const input = {
      style: "list",
      reviews: [
        { ...row, reply },
        { ...row, name: "Blair" },
      ],
    };
    const html = renderInstance("Review", input, "filled", theme);
    const offered = affordancesOf(meta, stampItemIds(meta, props.parse(input)), "r1");
    expect(offered.map((action) => action.address)).toEqual(["r1/r1/reply", "r1/r2/reply"]);
    for (const id of ["r1", "r2"]) {
      for (const part of ["root", "stars", "name", "date", "text", "reply"])
        expect(html).toContain(`data-testid="home/c1/${id}/${part}"`);
      expect(elementAt(html, `home/c1/${id}/reply`).attributes).toContain('role="button"');
    }
    expect(html.includes('data-testid="home/c1/r1/response"')).toBe(Boolean(reply));
    const reading = readComponent(components.Review, input, "r1").join("\n");
    for (const text of [row.date, "5 of 5", reviewLabels.reply, "!needs-people"])
      expect(reading).toContain(text);
    if (reply) expect(reading).toContain(props.parse(input).reviews![0]!.reply);
  });
  it.each([summary, list])("renders a calm shared empty state without review actions", (input) => {
    const html = renderInstance("Review", input, "empty", theme);
    expect(html).toContain("Nothing here yet");
    expect(html).not.toContain('role="button"');
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(readComponent(components.Review, input, "r1", "empty")).toHaveLength(1);
  });
});
describe("Review live actions", () => {
  // prettier-ignore
  it("toggles a spoiler independently without leaking or saving hidden content", () => {
    const reply = "The ending surprised us.";
    const reviews = [{ ...row, spoiler: true, reply, photos: ["lib:ending"] },
      { ...row, spoiler: true, text: "A separate plot detail." }];
    const input = { ...list, reviews };
    const html = renderInstance("Review", input, "filled", theme);
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('aria-expanded="false"');
    for (const hidden of [row.text, reply, "photo_1"]) expect(html).not.toContain(hidden);
    const screen = { id: "home", components: [{ id: "c1", c: "Review", ...input }] };
    const runtime = createScreenController({ screen, defs: components });
    expect(runtime.read()).toContain("[c1/r1 toggle:off]");
    expect(runtime.read()).not.toContain(row.text);
    expect(runtime.press("c1/r1").ok).toBe(true);
    expect(runtime.read()).toContain(row.text);
    expect(runtime.read()).toContain("photo:ending");
    expect(runtime.read()).not.toContain(reviews[1]!.text);
    expect(runtime.press("c1/r1").ok).toBe(true);
    expect(runtime.read()).not.toContain(row.text);
    expect(runtime.snapshotScreen()).toEqual(screen);
    runtime.dispose();
  });
  it.each([list, summary, { ...list, state: "empty" as const }])(
    "dispatches only visible replies",
    (input) => {
      const onAction = vi.fn();
      const runtime = createScreenController({
        screen: { id: "home", components: [{ id: "r1", c: "Review", ...input }] },
        defs: components,
        onAction,
      });
      const visible = input === list;
      expect(runtime.press("r1/r1/reply")).toMatchObject({ ok: visible });
      expect(onAction).toHaveBeenCalledTimes(Number(visible));
      if (visible) expect(onAction).toHaveBeenCalledWith({ address: "home/r1/r1/reply", action: "press" });
      runtime.dispose();
    },
  );
});
