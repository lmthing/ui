import { expect, it } from "vitest";
// prettier-ignore
import { components, createRegistry, packReady, placeholderTitle, planAct, readScreen, stampItemIds, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.StationRates;
const { examples, props, meta, probes, fallback } = def;
const [fuel, ev] = [examples[0]!, examples[1]!];
const defs = { StationRates: def };
const cast = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown = fuel, state: StateName = "filled") =>
  renderInstance("StationRates", input, state, theme);
const screen = (input: object = fuel, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "StationRates", state }],
});
const address = "home/c1/";
const parts = (input?: unknown, state?: StateName) => addressedElements(draw(input, state));
const step = (part: string) => ({ address: part ? `s1/${part}` : "s1", action: "press" as const });
const unavailable = { ok: false, code: "not_actionable" };

it.each(examples)("accepts realistic examples", (input) => expect(props.safeParse(input).success).toBe(true));

// prettier-ignore
it("accepts exact text and array limits, trims names and stamps only view items", () => {
  const name = "s".repeat(32);
  const grades = Array(5).fill({ label: "g".repeat(16), price: 0.01, unit: "u".repeat(6) });
  const chargers = Array(4).fill({ connector: "c".repeat(12), kw: 1, available: 0, total: 1 });
  expect(props.parse({
    name: ` ${name} `, kind: "ev", brand: "b".repeat(20), distance: "d".repeat(10),
    updatedAt: "a".repeat(12), offer: { cashback: "o".repeat(20), claimed: true }, grades, chargers,
  })).toMatchObject({ name, detail: "full", grades, chargers });
  expect(stampItemIds(meta, props.parse(ev))).toHaveProperty("rateRows.2.id", "r3");
});

// prettier-ignore
it.each([
  { name: " " }, { name: "n".repeat(33) }, { brand: "b".repeat(21) }, { distance: "d".repeat(11) },
  { updatedAt: "t".repeat(13) }, { kind: "hybrid" }, { grades: [] }, { grades: Array(6).fill(fuel.grades![0]) },
  { grades: [{ label: "g".repeat(17), price: 1 }] }, { grades: [{ label: "A", price: 0 }] },
  { grades: [{ label: "A", price: -1 }] }, { grades: [{ label: "A", price: Infinity }] },
  { grades: [{ label: "A", price: 1, unit: "x".repeat(7) }] }, { grades: [{ label: "A", price: 1, id: "r1" }] },
  { grades: [{ label: "A", price: 1, currency: "USD" }] }, { offer: { cashback: "o".repeat(21), claimed: false } },
  { offer: { cashback: "15¢" } }, { goto: "Invalid ID" }, { color: "red" }, { style: "compact" },
  { detail: "tiny" }, { density: "compact" }, { surface: "outlined" },
  { hasStation: true }, { canClaim: true }, { headline: "fake" },
  { chargers: ev.chargers }, { grades: undefined },
])("rejects invalid overrides %j", (invalid) => expect(props.safeParse({ ...fuel, ...invalid }).success).toBe(false));

it("allows EV stalls or rates alone but rejects invalid counts, power, labels and overflows", () => {
  const charger = ev.chargers![0]!;
  const input = { kind: "ev", name: ev.name };
  expect(props.safeParse({ ...input, chargers: [charger] }).success).toBe(true);
  expect(props.safeParse({ ...input, grades: ev.grades, chargers: [] }).success).toBe(true);
  for (const invalid of [
    { connector: "c".repeat(13) },
    { kw: 0 },
    { available: -1 },
    { total: 0 },
    { available: 5 },
    { available: 0.5 },
    { total: 3.5 },
    { position: 1 },
  ])
    expect(props.safeParse({ ...input, chargers: [{ ...charger, ...invalid }] }).success).toBe(false);
  expect(props.safeParse({ ...input, chargers: Array(5).fill(charger) }).success).toBe(false);
});

it("uses a cast title or neutral placeholder without inventing prices or offers", () => {
  expect(fallback({ cast })).toEqual({ name: placeholderTitle(0), kind: "ev" });
  const item = { id: "station", type: "venue", sample: true, name: "X".repeat(64) };
  const things = [{ type: "venue", fields: ["name"] }];
  expect(props.parse(fallback({ cast: { things, items: [item] } })).name).toBe("X".repeat(32));
  expect(props.parse(fallback({ cast: { things, items: [{ ...item, name: 2 }] } })).name).toBe(
    placeholderTitle(0),
  );
  expect(parts(fallback({ cast })).get(`${address}status`)?.text).toEqual([
    "No rates reported for this station",
  ]);
});

it("keeps the core near miss, a brief write probe and pack readiness gating", () => {
  expect(meta.tier).toBe("service");
  expect(meta.partTiers).toMatchObject({
    root: "phone",
    distance: "ok",
    claim: "service",
    directions: "service",
  });
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "KeyValue" }));
  expect(probes).toContainEqual(
    expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
  );
  expect(createRegistry({ packs: ["places"] }).ids.includes("StationRates")).toBe(packReady("places"));
});

it("draws bounded fuel prices, update time, distance and actions", () => {
  const filled = parts();
  for (const part of [
    "root",
    "frame",
    "name",
    "brand",
    "distance",
    "offer_card",
    "offer",
    "claim",
    "directions",
  ])
    expect(filled.has(`${address}${part}`)).toBe(true);
  expect(filled.get(`${address}updated`)?.text).toEqual(["Updated 10:42"]);
  expect(filled.get(`${address}r1/price`)?.text).toEqual(["$3.49/gal"]);
  expect(filled.get(`${address}r3/grade`)?.text).toEqual(["Diesel"]);
  expect(filled.get(`${address}root`)?.attributes).toContain('role="link"');
});

it("draws the EV price and addressed stall rows, then replaces them with a headline", () => {
  const full = parts(ev);
  expect(full.get(`${address}r1/price`)?.text).toEqual(["$0.42/kWh"]);
  expect(full.get(`${address}r2/power`)?.text).toEqual(["150 kW"]);
  expect(full.get(`${address}r3/stalls`)?.text).toEqual(["0 of 2 open"]);
  const brief = parts({ ...ev, detail: "brief" });
  expect(brief.get(`${address}headline`)?.text).toEqual(["3 of 6 open"]);
  expect([...brief.keys()].some((part) => part.startsWith(`${address}r`) && part !== `${address}root`)).toBe(
    false,
  );
  const compact = renderInstance("StationRates", ev, "filled", { ...theme, density: "compact" });
  expect([...addressedElements(compact).keys()]).toEqual([...full.keys()]);
  const compactFuel = parts({ ...fuel, detail: "brief" });
  expect(compactFuel.get(`${address}headline`)?.text).toEqual(["$3.49/gal"]);
  expect(compactFuel.get(`${address}headline_label`)?.text).toEqual(["Regular"]);
  expect(compactFuel.has(`${address}claim`)).toBe(true);
});

it.each([
  ["empty", "No rates reported for this station"],
  ["error", "Station feed unavailable"],
] as const)("draws a noninteractive %s state", (state, message) => {
  const stateParts = parts(fuel, state);
  expect(stateParts.get(`${address}status`)?.text).toEqual([message]);
  for (const part of ["claim", "directions", "offer", "r1/price"])
    expect(stateParts.has(`${address}${part}`)).toBe(false);
  expect(draw(fuel, state)).not.toContain('role="link"');
});

it("retains rates in success and draws an inert loading skeleton", () => {
  const success = parts(fuel, "success");
  expect(success.get(`${address}status`)?.text).toEqual(["Cashback claimed"]);
  expect(success.has(`${address}r1/price`)).toBe(true);
  expect(success.has(`${address}claim`)).toBe(false);
  expect(parts({ ...fuel, offer: { ...fuel.offer, claimed: true } }).get(`${address}claimed`)?.text).toEqual([
    "Cashback claimed",
  ]);
  const loading = draw(fuel, "loading");
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toMatch(/role="(link|button)"/);
  expect(addressedElements(loading).has(`${address}r1/price`)).toBe(false);
});

it("dispatches Claim and Directions separately from the station link", () => {
  const events: string[] = [];
  const controller = createScreenController({
    screen: screen(),
    defs,
    onAction: ({ address }) => events.push(address),
  });
  try {
    const reading = readScreen(screen(), defs);
    expect(reading).toContain("Claim offer");
    expect(reading).toContain("[s1/claim press !needs-service]");
    expect(reading).toContain("[s1/directions press !needs-service]");
    expect(controller.act(step("claim"))).toMatchObject({ ok: true });
    expect(controller.press("home/s1/directions")).toMatchObject({ ok: true });
    expect(events).toEqual(["home/s1/claim", "home/s1/directions"]);
    expect(planAct(screen(), defs, {}, [step("")])).toMatchObject({
      ok: true,
      links: [{ address: "home/s1", goto: "alder_fuel" }],
    });
  } finally {
    controller.dispose();
  }
});

// prettier-ignore
it("omits compactly hidden rates and refuses hidden or inactive actions", () => {
  const compact = readScreen(screen({ ...ev, detail: "brief" }), defs);
  expect(compact).toContain('"Charging stalls": 3 of 6 open');
  for (const hidden of ["CCS", "NACS", "kWh", "r2"]) expect(compact).not.toContain(hidden);
  expect(planAct(screen(ev), defs, {}, [step("claim")])).toMatchObject(unavailable);
  expect(planAct(screen(ev), defs, {}, [step("")])).toMatchObject(unavailable);
  expect(planAct(screen(fallback({ cast })), defs, {}, [step("directions")])).toMatchObject(unavailable);
  expect(planAct(screen({ ...fuel, offer: { ...fuel.offer, claimed: true } }), defs, {}, [step("claim")])).toMatchObject(unavailable);
  expect(planAct(screen(fuel, "success"), defs, {}, [step("claim")])).toMatchObject(unavailable);
  for (const state of ["empty", "loading", "error"] as const)
    for (const part of ["", "claim", "directions"])
      expect(planAct(screen(fuel, state), defs, {}, [step(part)])).toMatchObject(unavailable);
  expect(planAct(screen(), defs, {}, [step("r1/price")])).toMatchObject(unavailable);
});
