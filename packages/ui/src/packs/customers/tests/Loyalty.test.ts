import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Loyalty;
const seed = { stamps: 0, of: 4, reward: "A free visit" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: "filled" | "success" = "filled") =>
  renderInstance("Loyalty", input, state, theme);

describe("Loyalty contract and boundaries", () => {
  it.each(examples)("accepts every domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and derives, rather than accepts, action flags", () => {
    expect(props.parse({ ...seed, reward: " A free visit ", name: " Sam " })).toEqual({
      ...seed,
      name: "Sam",
      stamp: true,
      redeem: false,
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps["stamps"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  it.each([
    {},
    { ...seed, stamps: undefined },
    { ...seed, of: undefined },
    ...[-1, 0.5, 5, 13, NaN, Infinity, "1"].map((stamps) => ({ ...seed, stamps })),
    ...[0, 3, 4.5, 13, NaN, Infinity, "4"].map((of) => ({ ...seed, of })),
    ...["", " ", "x".repeat(41)].map((reward) => ({ ...seed, reward })),
    ...["", " ", "x".repeat(25)].map((name) => ({ ...seed, name })),
    { ...seed, color: "#ff0000" },
    { ...seed, pixels: 12 },
    { ...seed, style: "stamps" },
    { ...seed, stamp: true },
    { ...seed, redeem: false },
    { ...seed, id: "l1" },
  ])("rejects invalid or writer-owned action flags", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts exact maximum lengths and all target/count boundaries", () => {
    for (let of = 4; of <= 12; of++)
      for (let stamps = 0; stamps <= of; stamps++)
        expect(props.safeParse({ stamps, of, reward: "x".repeat(40), name: "x".repeat(24) }).success).toBe(
          true,
        );
  });
});

describe("Loyalty fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["name", "detail"] }],
      items: [{ id: "a", type: "record", sample: true, name: "Sam", detail: "A free visit" }],
    },
    {
      things: [],
      items: [
        { id: "a", type: "record", sample: true, title: "Sam", detail: "A free visit" },
        { id: "b", type: "other", sample: true, name: "Other" },
      ],
    },
    {
      things: [{ type: "record", fields: ["name", "detail"] }],
      items: [{ id: "a", type: "record", sample: false, name: "x".repeat(80), detail: "y".repeat(80) }],
    },
    { things: [], items: [{ id: "a", type: "record", sample: true, name: 4, detail: false }] },
  ];
  it.each(casts)("validates empty, full, mixed, long and malformed casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast fields and shared neutral placeholders, never invented progress", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({
      stamps: 0,
      of: 10,
      reward: placeholderDetail,
      name: "Item one",
    });
    expect(fallback({ cast: casts[1]! })).toEqual({ stamps: 0, of: 10, reward: "A free visit", name: "Sam" });
    expect(fallback({ cast: casts[2]! }).name).toBe("Sam");
    expect(fallback({ cast: casts[3]! }).name).toHaveLength(24);
    expect(fallback({ cast: casts[3]! }).reward).toHaveLength(40);
    expect(fallback({ cast: casts[4]! }).name).toBe("Item one");
  });
});

describe("Loyalty states and parts", () => {
  it("draws filled progress without overriding the stored count", () => {
    for (const stamps of [0, 3, 4]) {
      const html = draw({ ...seed, stamps });
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      for (const part of ["stamps", "of", "reward", stamps === 4 ? "redeem" : "stamp"])
        expect(elementAt(html, `home/c1/${part}`).attributes).toContain("data-testid");
      expect(html.includes('data-testid="home/c1/earned"')).toBe(stamps === 4);
      expect(html).not.toContain('data-testid="home/c1/name"');
    }
  });
  it("shows the earned reward in success without inventing a count or offering actions", () => {
    for (const stamps of [0, 3, 4]) {
      const input = { ...seed, stamps };
      const html = draw(input, "success");
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      for (const part of ["earned", "reward"])
        expect(elementAt(html, `home/c1/${part}`).attributes).toContain("data-testid");
      for (const part of ["stamps", "of", "stamp", "redeem"])
        expect(html).not.toContain(`data-testid="home/c1/${part}"`);
      expect(html).toContain("Reward earned");
      expect(readComponent(components.Loyalty, input, "l1", "success")).toEqual(["l1 Loyalty (success)"]);
    }
  });
  it("draws an optional name and bounded reward without clipping props", () => {
    const html = draw({ stamps: 12, of: 12, reward: "x".repeat(40), name: "x".repeat(24) });
    expect(elementAt(html, "home/c1/name").attributes).toContain("data-testid");
    expect(html).toContain("x".repeat(40));
    expect(html).toContain("x".repeat(24));
  });
});

describe("Loyalty read/act and core-first probes", () => {
  it.each(examples)("reads exactly the reward text drawn on screen", (example) => {
    expect(draw(example)).toContain(example.reward);
    expect(readComponent(components.Loyalty, example, "l1").join("\n")).toContain(example.reward);
  });
  it.each(Array.from({ length: 9 }, (_, index) => index + 4))(
    "offers exactly the drawn phone-tier button at every count toward %s",
    (of) => {
      for (let stamps = 0; stamps <= of; stamps++) {
        const input = { ...seed, of, stamps };
        const part = stamps === of ? "redeem" : "stamp";
        const html = draw(input);
        expect(html.match(/aria-hidden="true"/g)).toHaveLength(of);
        expect(affordancesOf(meta, props.parse(input), "l1")).toEqual([
          { address: `l1/${part}`, part, action: "press", detail: "" },
        ]);
        expect(elementAt(html, `home/c1/${part}`).attributes).toContain('role="button"');
        expect(html).not.toContain(`data-testid="home/c1/${part === "stamp" ? "redeem" : "stamp"}"`);
        const reading = readComponent(components.Loyalty, input, "l1").join("\n");
        expect(reading).toContain(`${stamps} of ${of}`);
        expect(reading).toContain(`[l1/${part} press]`);
        expect(reading).toContain(stamps === of ? "Redeem reward" : "Add stamp");
        expect(reading.includes("Reward earned")).toBe(stamps === of);
      }
      expect(meta.tier).toBe("phone");
      expect(meta.weight).toBe(2);
    },
  );
  it("keeps core-first probes and the pack readiness gate", () => {
    expect(meta.status).toBe("ready");
    expect(meta.states).toEqual(["filled", "success"]);
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Streak");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Streak")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Loyalty" });
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "l1/stamp", action: "press" },
      { address: "l1/redeem", action: "press" },
    ]);
    expect(createRegistry({ packs: ["customers"] }).ids.includes(meta.id)).toBe(packReady("customers"));
    expect(createRegistry({ packs: ["customers"], includeDrafts: true }).ids).toContain("Loyalty");
  });
});
