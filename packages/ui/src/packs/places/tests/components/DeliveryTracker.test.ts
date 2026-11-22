import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  type DeviceData,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.DeliveryTracker;
const { meta, props, examples, fallback, probes } = def;
const seed = examples[0]!;
const defs = { DeliveryTracker: def };
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const root = "home/c1";
const seedData = meta.previewDeviceData({ input: seed, state: "filled" });
const render = (input: unknown = seed, state: StateName = "filled", deviceData: DeviceData = seedData) =>
  renderInstance("DeliveryTracker", input, state, theme, { deviceData });
const draw = (...args: Parameters<typeof render>) => addressedElements(render(...args));
const screen = (state: StateName = "filled", input: unknown = seed) => ({
  id: "home",
  components: [{ ...(input as object), c: "DeliveryTracker", id: "d1", state }],
});
const call = { address: "d1/call", action: "press" } as const;

describe("DeliveryTracker contract and boundaries", () => {
  it.each(examples)("accepts delivery samples", (sample) =>
    expect(props.safeParse(sample).success).toBe(true),
  );

  it("defaults to a thumbnail and accepts exact bounds and local references", () => {
    const courier = "a".repeat(20);
    expect(props.parse({ step: "picked_up", courier: ` ${courier} `, photo: "local:2" })).toMatchObject({
      courier,
      photo: "local:2",
      media: "thumb",
      callable: true,
    });
    expectTypeOf<Props<typeof props, typeof meta>["courier"]>().toEqualTypeOf<string | undefined>();
  });

  it.each([
    {},
    { step: "lost" },
    { step: "nearby", courier: "a".repeat(21) },
    { step: "preparing", courier: " " },
    { step: "nearby", photo: "https://example.org/nia.png" },
    { step: "nearby", photo: `lib:${"a".repeat(65)}` },
    { step: "nearby", etaMinutes: 2 },
    { step: "nearby", position: { x: 0.2, y: 0.3 } },
    { step: "nearby", destination: { x: 0.2, y: 0.3 } },
    { step: "nearby", phone: "123" },
    { step: "nearby", callable: true },
    { step: "nearby", density: "tight" },
    { step: "nearby", media: "hero" },
    { step: "nearby", surface: "tinted" },
    { step: "nearby", color: "red" },
  ])("rejects invalid input %j", (invalid) => expect(props.safeParse(invalid).success).toBe(false));

  it("preserves core-first probes, the service tier and the pack gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "service" });
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["places"] }).ids.includes("DeliveryTracker")).toBe(packReady("places"));
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "DeliveryTracker" }),
      expect.objectContaining({ kind: "choose", expect: "Route" }),
      expect.objectContaining({ kind: "write", expect: "DeliveryTracker" }),
      expect.objectContaining({
        kind: "write",
        expect: "DeliveryTracker",
        variant: { axis: "media", value: "none" },
      }),
      expect.objectContaining({ kind: "read", expect: call }),
    ]);
  });
});

describe("DeliveryTracker fallback", () => {
  it("never guesses a courier from an unrelated cast item or enables a call on the neutral seed", () => {
    const things = [{ type: "delivery", fields: ["name"] }];
    const item = { id: "pots", type: "delivery", sample: true, name: "Pot delivery" };
    for (const cast of [
      { things: [], items: [] },
      { things, items: [item] },
      { things, items: [{ ...item, name: 9 }] },
    ]) {
      expect(fallback({ cast })).toEqual({ step: "preparing" });
      expect(props.parse(fallback({ cast }))).toMatchObject({ callable: false });
    }
  });
});

describe("DeliveryTracker states and parts", () => {
  it("renders the map, estimate, stage, courier and conditional call with stable addresses", () => {
    const parts = draw();
    for (const part of meta.parts) expect(parts.has(`${root}/${part}`)).toBe(true);
    expect(parts.get(`${root}/eta`)?.text).toEqual(["8 min"]);
    expect(parts.get(`${root}/step`)?.text).toEqual(["On the way"]);
    expect(parts.get(`${root}/courier`)?.text).toEqual(["Nia"]);
    expect(parts.get(`${root}/call`)?.attributes).toContain('role="button"');
    expect(parts.get(`${root}/call_label`)?.text).toEqual(["Call courier"]);
  });

  it("keeps finish addresses and hides only the photo in the no-media variant", () => {
    const addresses = [...draw().keys()];
    expect([...draw({ ...seed }).keys()]).toEqual(addresses);
    expect([...draw({ ...seed, media: "none" }).keys()]).toEqual(
      addresses.filter((address) => address !== `${root}/photo`),
    );
  });

  it("uses an unavailable estimate without host data and does not require a courier or photo", () => {
    const parts = draw({ step: "preparing" }, "filled", {});
    expect([...parts.keys()]).toEqual([`${root}/root`, `${root}/eta`, `${root}/step`, `${root}/map`]);
    expect(parts.get(`${root}/eta`)?.text).toEqual(["Estimate unavailable"]);
  });

  it("draws inert shape while loading and drops ETA and call on either delivered path", () => {
    const loading = render(seed, "loading");
    expect([...addressedElements(loading).keys()]).toEqual([
      `${root}/root`,
      `${root}/map`,
      `${root}/photo`,
      `${root}/call`,
    ]);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="button"');
    for (const parts of [draw(seed, "success"), draw({ ...seed, step: "delivered" })]) {
      expect(parts.get(`${root}/step`)?.text).toEqual(["Delivered"]);
      expect(parts.get(`${root}/courier`)?.text).toEqual(["Nia"]);
      expect(parts.has(`${root}/eta`)).toBe(false);
      expect(parts.has(`${root}/call`)).toBe(false);
      expect(parts.has(`${root}/map`)).toBe(true);
    }
  });
});

describe("DeliveryTracker read and act", () => {
  it("reads the rendered estimate and exposes a service-tier courier call with no navigation", () => {
    const read = readScreen(screen(), defs, {}, "en", seedData);
    for (const text of [
      "Estimated arrival",
      "8 min",
      "On the way",
      "Call courier",
      "[d1/call press !needs-service]",
    ])
      expect(read).toContain(text);
    expect(planAct(screen(), defs, {}, [call])).toMatchObject({ ok: true, links: [] });
    expect(readScreen(screen(), defs)).not.toContain("8 min");
  });

  it.each([
    screen("filled", { step: "preparing" }),
    screen("filled", { ...seed, step: "delivered" }),
    screen("success"),
    screen("loading"),
  ])("neither reads nor accepts an inactive call: %j", (inactive) => {
    expect(readScreen(inactive, defs, {}, "en", seedData)).not.toContain("Call courier");
    expect(planAct(inactive, defs, {}, [call])).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("reads Delivered without the previous stage or estimate in success", () => {
    const read = readScreen(screen("success"), defs, {}, "en", seedData);
    expect(read).toContain("Delivered");
    expect(read).not.toMatch(/On the way|Estimated arrival|8 min/);
  });
});
