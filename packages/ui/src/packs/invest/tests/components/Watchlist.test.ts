import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";
import { Watchlist as watchlistModule, pack } from "../..";
import { investWordsFor } from "../../lang";

const { Watchlist } = components;
const { props, fallback, examples, meta, probes } = Watchlist;
type Input = ReturnType<typeof fallback>;
const seed: Input = examples[0]!;
const full: Input = examples[1]!;
const row = seed.items[0]!;
const words = investWordsFor().watchlist;
const screen = (state: StateName = "filled") => ({
  id: "home",
  components: [{ id: "w1", c: meta.id, state, ...seed }],
});
const target = "w1/r1/remove";
const read = (input = seed, state: StateName = "filled") =>
  readComponent(Watchlist, input, "w1", state).join("\n");
const render = (input = seed, state: StateName = "filled") =>
  renderInstance(
    meta.id,
    input,
    state,
    { preset: "calm", mode: "light", accent: "moss" },
    { component: "w1" },
  );

describe("Watchlist schema and fallback", () => {
  it.each(examples)("accepts domain examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("bounds rows, rejects derived fields, and preserves a zero quote", () => {
    for (const patch of [
      { name: "x".repeat(33) },
      { target: 0 },
      { direction: "at_or_above" },
      { gap: 7 },
      { color: "red" },
      { id: "r1" },
    ])
      expect(props.safeParse({ items: [{ ...row, ...patch }] }).success).toBe(false);
    for (const items of [
      [],
      [row, row],
      Array.from({ length: 7 }, (_, i) => ({ ...row, assetId: `a_${i}` })),
    ])
      expect(props.safeParse({ items }).success).toBe(false);
    const { items } = props.parse({
      items: Array.from({ length: 6 }, (_, i) => ({ ...row, assetId: `a_${i}`, price: 0 })),
    });
    expect(items[5]?.price).toBe(0);
    expect(props.safeParse({ ...seed, density: "tiny" }).success).toBe(false);
    expect(props.safeParse({ ...seed, quote_service: true }).success).toBe(false);
  });
  it("derives seed names from matching, missing or malformed cast fields", () => {
    for (const [name, expected] of [
      ["North Equity", "North Equity"],
      [4, "Item one"],
    ] as const) {
      const input = fallback({
        cast: {
          things: [{ type: "fund", fields: ["name"] }],
          items: [{ id: "north", type: "fund", sample: true, name }],
        },
      });
      expect(props.parse(input).items[0]?.name).toBe(expected);
    }
    expect(props.parse(fallback({ cast: { things: [], items: [] } })).items[0]?.name).toBe("Item one");
  });
  it("keeps the pack gate, service tier, confirmation and required probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({
      tier: "phone",
      partTiers: { refresh: "service" },
      confirmParts: ["remove"],
    });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "full" } }),
        expect.objectContaining({ kind: "read", expect: { address: target, action: "press" } }),
      ]),
    );
  });
});

describe("Watchlist parts and actions", () => {
  it("exposes stable addresses and reads only the displayed threshold", () => {
    const brief = { ...full, detail: "brief" as const };
    const parts = (input: typeof full) => [...addressedElements(render(input)).keys()];
    expect(parts(full).filter((part) => !/\/(?:target|gap)$/.test(part))).toEqual(parts(brief));
    expect(parts(full)).toContain("home/w1/r2/gap");
    expect(read(full)).toContain("Target ≥ $75");
    expect(read(brief)).not.toContain("Target ≥ $75");
    expect(read()).toContain("[w1/r1 press→income_fund]");
    expect(read(full)).not.toContain("[w1/r1 press");
  });
  it("shows inert loading, neutral empty, success and saved quotes after a refresh error", () => {
    for (const state of ["loading", "empty", "success", "error"] as const) {
      const html = render(seed, state);
      expect(html).not.toContain('role="button"');
      expect(read(seed, state)).not.toContain(`[${target} press`);
      expect(visibleTexts(html).includes("$55")).toBe(state === "error");
    }
    expect(render(seed, "success")).toContain(words.removed);
    expect(render(seed, "error")).toContain(words.refreshFailed);
  });
  it("dispatches removal only on confirmation and never follows the row link", () => {
    const onLink = vi.fn(),
      onAction = vi.fn();
    const controller = createScreenController({ screen: screen(), defs: { Watchlist }, onLink, onAction });
    expect(controller.press(target).ok).toBe(true);
    expect(controller.confirmation?.source).toBe(`home/${target}`);
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.press(target).ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `home/${target}`, action: "press" });
    expect(onLink).not.toHaveBeenCalled();
  });
  it("allows only service-backed refresh, including after a failed refresh", () => {
    const onAction = vi.fn();
    const offline = createScreenController({ screen: screen(), defs: { Watchlist }, onAction });
    expect(offline.press("w1/refresh").ok).toBe(false);
    const bound = watchlistModule.bindWatchlist((id) => id === "w1");
    const online = createScreenController({ screen: screen("error"), defs: { Watchlist: bound }, onAction });
    expect(online.read()).toContain("[w1/refresh press !needs-service]");
    expect(online.press("w1/refresh").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/w1/refresh", action: "press" });
  });
});
