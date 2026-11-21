import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  wordsFor,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Invite;
const { props, meta, examples, fallback, probes } = def;
const example = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/i1/${part}`;
const draw = (input: unknown) =>
  addressedElements(renderInstance("Invite", input, "filled", theme, { component: "i1" }));
const read = (input: unknown, lang?: string) =>
  readComponent(def, input, "i1", "filled", {}, lang).join("\n");

describe("Invite schema", () => {
  it.each(examples)("accepts a real example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("trims the title and code and accepts exact bounds", () => {
    const boundary = { ...example, title: "T".repeat(32), code: "W".repeat(12), joined: 999999 };
    const parsed = props.parse({ ...boundary, code: `  ${boundary.code}  ` });
    expect(parsed).toMatchObject({ ...boundary, align: "start", surface: "card", detail: "full" });
    expect(parsed.density).toBeUndefined();
    expect(draw(boundary).get(address("code"))?.text).toEqual([boundary.code]);
    expect(props.safeParse({ ...example, joined: 0 }).success).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["qr"]>().toEqualTypeOf<boolean>();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
  // prettier-ignore
  it.each([
    {}, ...[
      { title: " " }, { title: "x".repeat(33) }, { code: "" }, { code: "W".repeat(13) },
      { qr: "true" }, { qr: undefined }, { joined: "6" }, { joined: -1 }, { joined: 0.5 },
      { joined: 1000000 }, { align: "right" }, { detail: "minimal" }, { surface: "tinted" },
      { density: "tiny" }, { color: "red" }, { pixels: 4 },
    ].map((patch) => ({ ...example, ...patch })),
  ])("rejects invalid wire input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Invite fallback and metadata", () => {
  it("uses bounded cast titles without inferring a join code", () => {
    const things = [{ type: "group", fields: ["label", "description"] }];
    const empty: CastLike = { things: [], items: [] };
    const valid: CastLike = {
      things,
      items: [{ id: "group", type: "group", sample: true, label: "X".repeat(40), description: "Desc" }],
    };
    const malformed: CastLike = {
      things,
      items: [{ id: "group", type: "group", sample: true, label: 7 }],
    };
    const neutral = { title: "Item one", code: wordsFor("en").placeholderValue, qr: false };
    for (const cast of [empty, valid, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual(neutral);
    expect(fallback({ cast: malformed })).toEqual(neutral);
    expect(fallback({ cast: valid })).toEqual({ ...neutral, title: "X".repeat(32) });
  });
  it("keeps the tier, pack gate and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "people", weight: 2, states: ["filled"] });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("People");
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Invite")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Invite")).toBe(packReady("social"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Invite" }),
        expect.objectContaining({ kind: "choose", expect: "People" }),
        expect.objectContaining({ kind: "write", expect: "Invite" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "i1/copy", action: "press" } }),
        expect.objectContaining({ kind: "read", expect: { address: "i1/share", action: "press" } }),
      ]),
    );
  });
});

describe("Invite state, parts and reading", () => {
  it("shows the same invite code as text and in a scannable, labeled QR", () => {
    const drawn = draw(example);
    expect([...drawn.keys()].sort()).toEqual(meta.parts.map(address).sort());
    expect(drawn.get(address("title"))?.text).toEqual([example.title]);
    expect(drawn.get(address("code"))?.text).toEqual([example.code]);
    expect(drawn.get(address("qr"))?.attributes).toContain('aria-label="Invite QR code"');
    const payloadPath = (code: string) => {
      const html = renderInstance("Invite", { ...example, code }, "filled", theme);
      return html.match(/<path\b[^>]* d="([^"]+)"/)?.[1];
    };
    expect(payloadPath(example.code)).toBeTruthy();
    expect(payloadPath("OTHER28")).not.toBe(payloadPath(example.code));
    const reading = read(example);
    for (const value of [example.title, example.code, "Invite QR code", "6 people joined"]) {
      expect(reading).toContain(value);
    }
  });
  it("omits only QR and count when not provided and shows a supplied zero", () => {
    const absent = { ...example, qr: false, joined: undefined };
    const optional = [address("joined"), address("qr")];
    expect([...draw(absent).keys()]).toEqual(
      [...draw(example).keys()].filter((key) => !optional.includes(key)),
    );
    expect(read(absent)).not.toContain("Invite QR code");
    expect(read(absent)).not.toContain("people joined");
    expect(draw({ ...absent, joined: 0 }).get(address("joined"))?.text).toEqual(["0 people joined"]);
    expect(read({ ...absent, joined: 1000 }, "ar-EG")).toContain("١٠٠٠ people joined");
  });
  it("preserves finish addresses and hides only the count in brief without dropping the value", () => {
    const full = [...draw(example).keys()];
    const compact = { ...example, density: "compact", surface: "outlined", align: "center" };
    const brief = { ...example, detail: "brief" };
    expect([...draw(compact).keys()]).toEqual(full);
    expect([...draw(brief).keys()]).toEqual(full.filter((key) => key !== address("joined")));
    expect(props.parse(brief).joined).toBe(example.joined);
    expect(read(brief)).not.toContain("people joined");
    expect(read(brief)).toContain("Invite QR code");
  });
});

describe("Invite actions", () => {
  it.each(examples)("exposes only copy and share, without navigation or confirmation", (input) => {
    const onAction = vi.fn();
    const onLink = vi.fn();
    const screen = { id: "home", components: [{ ...input, c: "Invite", id: "i1" }] };
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    try {
      const drawn = draw(input);
      const reading = read(input);
      for (const [part, label] of [
        ["copy", "Copy code"],
        ["share", "Share invite"],
      ] as const) {
        expect(drawn.get(address(part))?.attributes).toContain('role="button"');
        expect(drawn.get(address(`${part}_label`))?.text).toEqual([label]);
        expect(reading).toContain(label);
        expect(reading).toContain(`[i1/${part} press !needs-people]`);
        expect(runtime.press(`i1/${part}`).ok).toBe(true);
        expect(runtime.confirmation).toBeUndefined();
      }
      for (const part of ["code", "qr", "joined"]) expect(runtime.press(`i1/${part}`).ok).toBe(false);
      expect(onAction.mock.calls.map(([event]) => event)).toEqual([
        { address: address("copy"), action: "press" },
        { address: address("share"), action: "press" },
      ]);
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
    }
  });
});
