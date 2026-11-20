import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  sessionKey,
  sessionState,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import type { input } from "zod";
import { addressedElements, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.TurnOrder;
type Setup = input<typeof props>;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/t1/${part}`;
const press = (part: string) => ({ address: `t1/${part}`, action: "press" });
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };
const controls = ["next", "skip", "reverse", "restart"];
const turnControls = controls.slice(0, 3);

function render(setup: Setup, state: StateName) {
  return addressedElements(renderInstance("TurnOrder", setup, state, theme, { component: "t1" }));
}

function game(setup: Setup, state: StateName = "filled") {
  const onAction = vi.fn();
  const screen = { id: "home", components: [{ ...setup, id: "t1", c: "TurnOrder", state }] };
  const runtime = createScreenController({ screen, defs: components, onAction });
  const progress = () => sessionState(meta, props.parse(setup), (part) => runtime.store.get(address(part)));
  return { runtime, progress, onAction };
}

describe("TurnOrder contract and boundaries", () => {
  it.each(examples)("accepts the domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("defaults to the first player in a forward ring and accepts exact limits", () => {
    const players = [{ name: "  Anna " }, { name: "Ben" }];
    expect(props.parse({ players })).toEqual({
      players: [{ name: "Anna" }, { name: "Ben" }],
      first: 0,
      direction: "forward",
      style: "ring",
    });
    const full = Array.from({ length: 6 }, () => ({ name: "n".repeat(24), photo: "local:1" }));
    expect(props.safeParse({ players: full, first: 5, laps: 12 }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["players"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    { players: [] },
    { players: [{ name: "Solo" }] },
    { players: Array.from({ length: 7 }, () => ({ name: "Name" })) },
    { players: [{ name: "n".repeat(25) }, { name: "Ben" }] },
    { players: [{ name: " " }, { name: "Ben" }] },
    { players: [{ name: "Anna", photo: "https://example.org/avatar.png" }, { name: "Ben" }] },
    { players: [{ name: "Anna", id: "r1" }, { name: "Ben" }] },
    { first: -1 },
    { first: 3 },
    { first: 1.5 },
    { laps: 0 },
    { laps: 13 },
    { laps: 1.5 },
    { direction: "clockwise" },
    { style: "grid" },
    { lap: 1 },
    { current: "Anna" },
    { skips: 0 },
    { turns: 0 },
    { [sessionKey]: {} },
    { color: "red" },
  ])("rejects invalid, derived, or unknown fields", (input) => {
    expect(props.safeParse({ ...examples[0], ...input }).success).toBe(false);
  });

  it("keeps the phone tier, core-first probes, and pack readiness gate", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.confirmParts).toEqual(["restart"]);
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "TurnOrder" }),
      expect.objectContaining({ kind: "choose", expect: "People" }),
      expect.objectContaining({ kind: "write", expect: "TurnOrder" }),
      expect.objectContaining({ kind: "read", expect: press("next") }),
      expect.objectContaining({ kind: "read", expect: press("reverse") }),
    ]);
    expect(createRegistry({ packs: ["play"] }).ids.includes("TurnOrder")).toBe(packReady("play"));
  });
});

describe("TurnOrder fallback", () => {
  it("uses neutral placeholders and cast titles without inventing game progress", () => {
    const items: CastLike["items"] = [{ id: "a", type: "player", sample: true, name: "Anna" }];
    const playerCast = { things: [{ type: "player", fields: ["name"] }], items };
    const malformed = { ...playerCast, items: [{ ...items[0]!, name: 4 }] };
    const empty = { things: [], items: [] };
    for (const cast of [empty, playerCast, malformed]) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
    expect(fallback({ cast: empty })).toEqual({ players: [{ name: "Item one" }, { name: "Item two" }] });
    expect(fallback({ cast: playerCast })).toEqual({ players: [{ name: "Anna" }, { name: "Item two" }] });
  });
});

describe("TurnOrder states and parts", () => {
  it.each(examples)(
    "addresses the current player, lap, roster, and four controls in both styles",
    (setup) => {
      const parts = render(setup, "filled");
      expect(parts.has(address("root"))).toBe(true);
      expect(parts.get(address("current"))?.text).toEqual([setup.players[setup.first ?? 0]!.name]);
      expect(parts.get(address("lap"))?.text.join("")).toMatch(/^Lap 1/);
      setup.players.forEach((player, index) => {
        const item = `r${index + 1}`;
        expect(parts.get(address(`${item}/name`))?.text).toEqual([player.name]);
        expect(parts.get(address(`${item}/photo`))?.attributes).toContain('role="img"');
        expect(parts.get(address(`${item}/root`))?.attributes.includes('aria-current="true"')).toBe(
          index === (setup.first ?? 0),
        );
      });
      for (const part of controls) expect(parts.get(address(part))?.attributes).toContain('role="button"');
    },
  );

  it("loads with its orbit root and no player parts, read text, or actions", () => {
    const parts = render(examples[0]!, "loading");
    expect(parts.has(address("root"))).toBe(true);
    for (const part of ["current", "lap", "r1/root", "r1/name", "r1/photo", ...controls]) {
      expect(parts.has(address(part))).toBe(false);
    }
  });

  it("keeps the roster and restart in success without showing unavailable controls", () => {
    const parts = render(examples[0]!, "success");
    expect(parts.get(address("current"))?.text).toEqual(["Last turn: Anna"]);
    expect(parts.get(address("lap"))?.text).toEqual(["Lap 2 of 2 · Forward"]);
    expect(parts.get(address("r1/root"))?.attributes).not.toContain('aria-current="true"');
    expect(parts.has(address("r1/name"))).toBe(true);
    expect(parts.get(address("restart"))?.attributes).toContain('role="button"');
    for (const part of turnControls) expect(parts.has(address(part))).toBe(false);
  });
});

describe("TurnOrder read and act", () => {
  it("consumes turns from a nonzero start, reverses only future movement, and retains the last player", () => {
    const { runtime, progress } = game({ ...examples[0]!, first: 1, laps: 2 });
    expect(runtime.read()).toContain("Current turn — Ben — Lap 1 of 2 · Forward");
    expect(runtime.act(press("reverse")).ok).toBe(true);
    expect(progress()).toMatchObject({ index: 1, turns: 0, skips: 0, direction: "reverse" });
    expect(runtime.act(press("skip")).ok).toBe(true);
    expect(progress()).toMatchObject({ index: 0, turns: 1, skips: 1, lap: 1 });
    expect(runtime.act([press("next"), press("next")]).ok).toBe(true);
    expect(runtime.read()).toContain("Current turn — Ben — Lap 2 of 2 · Reverse");
    expect(runtime.act([press("next"), press("next"), press("next")]).ok).toBe(true);
    expect(progress()).toMatchObject({ index: 2, turns: 6, skips: 1, complete: true });
    expect(runtime.read()).toContain("(success) Game complete — Last turn: Sam — Lap 2 of 2 · Reverse");
    expect(runtime.read()).toContain("[t1/restart press]");
    for (const part of turnControls) {
      expect(runtime.read()).not.toContain(`[t1/${part} press]`);
      expect(runtime.act(press(part)).ok).toBe(false);
    }
  });

  it("keeps queue IDs in writer order, continues without a limit, and gates restart on confirmation", () => {
    const { runtime, progress, onAction } = game(examples[1]!);
    expect(runtime.read()).toContain("Current turn — Lee — Lap 1 · Reverse");
    expect(runtime.read()).toContain('  r1 "Jo"\n  r2 "Lee"');
    expect(runtime.act([press("next"), press("skip"), press("next")]).ok).toBe(true);
    expect(progress()).toMatchObject({ index: 0, lap: 2, turns: 3, complete: false });
    expect(runtime.act(press("reverse")).ok).toBe(true);
    const pending = progress();
    expect(runtime.act(press("restart")).ok).toBe(true);
    expect(runtime.act(cancel).ok).toBe(true);
    expect(progress()).toEqual(pending);
    expect(onAction).toHaveBeenCalledTimes(4);
    expect(runtime.act(press("restart")).ok).toBe(true);
    expect(runtime.act(confirm).ok).toBe(true);
    expect(progress()).toMatchObject({ index: 1, direction: "reverse", lap: 1, turns: 0, skips: 0 });
  });

  it("restarts a completed game and blocks every action while loading", () => {
    const { runtime, progress } = game({ ...examples[1]!, laps: 1 });
    expect(runtime.act([press("next"), press("skip")]).ok).toBe(true);
    expect(runtime.act(press("restart")).ok).toBe(true);
    expect(runtime.read()).toContain("[confirm/confirm press]");
    expect(progress()).toMatchObject({ complete: true });
    expect(runtime.act(confirm).ok).toBe(true);
    expect(runtime.read()).toContain("Current turn — Lee — Lap 1 of 1 · Reverse");
    const loading = game(examples[0]!, "loading").runtime;
    expect(loading.read()).toBe("screen home\nt1 TurnOrder (loading)");
    for (const part of controls) expect(loading.act(press(part)).ok).toBe(false);
  });
});
