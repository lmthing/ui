import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  clockLine,
  components,
  createRegistry,
  readComponent,
  remainingLine,
  validateActionValue,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Player;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const base = { media: "lib:wind_down", title: "Evening wind-down", seconds: 720 };

describe("Player schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ ...base, title: " Evening " })).toEqual({
      ...base,
      title: "Evening",
      style: "audio",
      detail: "full",
    });
  });
  it.each([
    {},
    { ...base, media: undefined },
    { ...base, media: "https://example.org/a.mp3" },
    { ...base, media: "wind_down" },
    { ...base, media: `lib:${"a".repeat(65)}` },
    { ...base, title: "" },
    { ...base, title: "a".repeat(41) },
    { ...base, sub: "a".repeat(41) },
    { ...base, photo: "https://example.org/a.png" },
    { ...base, seconds: 0 },
    { ...base, seconds: 36001 },
    { ...base, seconds: 1.5 },
    { ...base, seconds: "60" },
    { ...base, at: -1 },
    { ...base, at: 721 },
    { ...base, style: "radio" },
    { ...base, style: "compact", mode: "video" },
    { ...base, mode: "radio" },
    { ...base, speed: 0 },
    { ...base, speed: 5 },
    { ...base, detail: "none" },
    { ...base, autoplay: true },
    { ...base, color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact limits and any start up to the end", () => {
    expect(
      props.safeParse({ ...base, title: "a".repeat(40), sub: "a".repeat(40), seconds: 36000, at: 36000 })
        .success,
    ).toBe(true);
    expect(props.safeParse({ ...base, seconds: 1, at: 0 }).success).toBe(true);
  });
  it("types view props and keeps the media reference out of drawing", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"audio" | "video" | "compact">();
    expectTypeOf<ViewProps["seconds"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Player fallback, metadata and actions", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "Guided Walk 2", fields: [] }], items: [] },
      { things: [{ type: "123 !!", fields: [] }], items: [] },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).media).toBe("lib:guided_walk_2");
  });
  it("offers seek, skip and both play and pause on the one button", () => {
    expect(
      affordancesOf(meta, props.parse(examples[0]), "p1").map((a) => `${a.address} ${a.action}`),
    ).toEqual(["p1/scrubber seek", "p1/back press", "p1/play play", "p1/play pause", "p1/forward press"]);
  });
  it("checks a seek value is seconds, not text or a negative", () => {
    expect(validateActionValue("seek", 90)).toBeNull();
    for (const bad of [-1, "90", undefined, NaN])
      expect(validateActionValue("seek", bad)?.code).toBe("invalid_value");
    expect(validateActionValue("play", undefined)).toBeNull();
    expect(validateActionValue("pause", 1)?.code).toBe("invalid_value");
  });
  it("reads the place in the recording", () => {
    const line = readComponent(components.Player, examples[0], "p1").join("\n");
    expect(line).toContain("4:05");
    expect(line).toContain("-7:55");
    const live = { "p1/play": true, "p1/scrubber": 300, "p2/play": false, "p3/$runtime": true };
    expect(readComponent(components.Player, examples[0], "p1", "filled", live).join("\n")).toContain(
      "5:00 — -7:00 — Playing",
    );
    expect(readComponent(components.Player, examples[0], "p2", "filled", live).join("\n")).toContain(
      "Paused",
    );
    expect(readComponent(components.Player, examples[0], "p3", "filled", live).join("\n")).toContain(
      "Paused",
    );
    expect(remainingLine(60)).toBe("-1:00");
    expect(clockLine(0)).toBe("0:00");
  });
  it("has well-formed probes naming the nearest neighbour", () => {
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["List", "Photo", "Timer"]) expect(meta.pick).toContain(near);
    expect(meta).toMatchObject({ weight: 3, region: "body", group: "content", tier: "phone" });
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Player",
      "List",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Player" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "p1/play", action: "pause" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id]) expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("resolves its ids", () => {
    const registry = createRegistry();
    expect(registry.resolve("p-l-a-y-e-r")).toBe("Player");
    expect(registry.resolve("p-l-a-y-e-r")).toBe("Player");
  });
});

describe("Player rendering", () => {
  it.each(examples.map((example) => [example.style, example] as const))(
    "draws %s with every control",
    (_, example) => {
      const html = renderInstance("Player", example, "filled", theme);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      for (const part of ["title", "scrubber", "elapsed", "remaining", "back", "play", "forward"])
        expect(html).toContain(`data-testid="home/c1/${part}"`);
      expect(html).toContain('aria-label="Back 15 seconds"');
      expect(html).toContain('role="slider"');
    },
  );
  it("shows artwork only for audio and video, and the scrubber at the start", () => {
    expect(renderInstance("Player", examples[0], "filled", theme)).toContain('data-testid="home/c1/artwork"');
    expect(renderInstance("Player", examples[2], "filled", theme)).not.toContain(
      'data-testid="home/c1/artwork"',
    );
    expect(renderInstance("Player", examples[1], "filled", theme)).toContain("0:00");
  });
  it("draws a skeleton while loading", () => {
    expect(renderInstance("Player", examples[0], "loading", theme)).toContain('aria-busy="true"');
  });
  it("mounts mode-only video with the original player actions", () => {
    expect(props.parse({ ...base, mode: "video" }).style).toBe("video");
    const rendered = renderInstance("Player", { ...base, mode: "video" }, "filled", theme);
    expect(rendered).toContain("Video");
    expect(rendered).toContain('data-testid="home/c1/play"');
  });
  it("draws the controls over the poster, and keeps legacy audio controls outside the artwork", () => {
    const video = renderInstance("Player", examples[1], "filled", theme);
    const frame = elementAt(video, "home/c1/root").children[0]!;
    expect(styleAt(video, frame)).toContain("position:relative");
    expect(frame.children[0]!.attributes).toContain('data-testid="home/c1/artwork"');
    expect(styleAt(video, frame.children[1]!)).toContain("position:absolute");
    const audio = renderInstance("Player", examples[0], "filled", theme);
    expect(elementAt(audio, "home/c1/root").children[0]!.attributes).toContain(
      'data-testid="home/c1/artwork"',
    );
  });
  it("does not hide artwork merely because density is compact", () => {
    const standard = { ...examples[0], density: "compact" };
    const brief = { ...standard, detail: "brief" };
    expect(renderInstance("Player", standard, "filled", theme)).toContain('data-testid="home/c1/artwork"');
    expect(renderInstance("Player", brief, "filled", theme)).not.toContain('data-testid="home/c1/artwork"');
    expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["artwork"] });
  });
});
