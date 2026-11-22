import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  wordsFor,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { props, fallback, examples, meta, probes } = components.PassReveal;

describe("PassReveal", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("builds up to three cast names without treating cast details as secrets", () => {
    const thing = { type: "guest", fields: ["name", "detail"] };
    const item = {
      id: "guest",
      type: "guest",
      sample: true,
      name: "Guest",
      detail: "Unrelated private data",
    };
    expect(fallback({ cast: { things: [thing], items: [item] } }).players).toEqual(
      ["Guest", placeholderTitle(1), placeholderTitle(2)].map((name) => ({
        name,
        role: wordsFor().placeholderDetail,
      })),
    );
    for (const items of [[], [{ ...item, name: 1 }]]) {
      expect(props.safeParse(fallback({ cast: { things: [thing], items } })).success).toBe(true);
    }
  });
  it("bounds private cards and refuses to seed runtime progress", () => {
    const player = { name: "n".repeat(24), role: "r".repeat(32), detail: "d".repeat(120) };
    const players = Array.from({ length: 12 }, () => player);
    expect(props.safeParse({ players, prompt: "p".repeat(48) }).success).toBe(true);
    for (const input of [
      { players: players.slice(0, 2) },
      { players: [...players, player] },
      { players: [...players.slice(1), { ...player, role: "r".repeat(33) }] },
      { players: [...players.slice(1), { ...player, detail: "d".repeat(121) }] },
      { players, prompt: "p".repeat(49) },
      { players, style: "other" },
      { players, seen: 1 },
    ])
      expect(props.safeParse(input).success).toBe(false);
  });
  it("never includes a veiled secret or a later player's name in the initial reading", () => {
    const lines = readComponent(components.PassReveal, examples[0], "p1").join("\n");
    expect(lines).toContain("Anna");
    expect(lines).toContain("Find your garden role");
    expect(lines).toContain("Player 1 of 3");
    for (const hidden of ["Seed keeper", "Save a seed", "Rain maker", "Trail finder", "Ben", "Sam"]) {
      expect(lines).not.toContain(hidden);
    }
    expect(lines).toContain("[p1/reveal press]");
  });
  it("declares confirmation, loading and round-ready states", () => {
    expect(meta.confirmParts).toEqual(["restart"]);
    expect(meta.states).toEqual(["filled", "empty", "loading", "success"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Choice" }));
    expect(createRegistry({ packs: ["play"] }).ids.includes(meta.id)).toBe(packReady("play"));
  });
});

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
function controller(style: "hold" | "curtain") {
  const screen = { id: "home", components: [{ ...examples[0], c: meta.id, id: "p1", style }] };
  return createScreenController({ screen, defs: components });
}
const secrets = /Seed keeper|Save a seed|Rain maker|Trail finder/;

it.each(["hold", "curtain"] as const)(
  "advances private %s rounds and requires confirmation to restart",
  (style) => {
    const runtime = controller(style);
    const hold = style === "hold";
    const reveal = () => runtime.act({ address: "p1/reveal", action: hold ? "start" : "press" }).ok;
    const hide = () =>
      runtime.act({ address: hold ? "p1/reveal" : "p1/hide", action: hold ? "stop" : "press" }).ok;
    try {
      expect(runtime.read()).toContain("Anna");
      expect(hide()).toBe(false);
      expect(runtime.press("p1/restart").ok).toBe(false);
      expect(runtime.act({ address: "p1/reveal", action: hold ? "press" : "start" }).ok).toBe(false);
      expect(runtime.act({ address: "p1/reveal", action: "flip" }).ok).toBe(false);
      for (const [index, name] of ["Anna", "Ben", "Sam"].entries()) {
        expect(reveal()).toBe(true);
        const text = runtime.read();
        expect(text).toContain(name);
        expect(text).toContain(`Player ${index + 1} of 3`);
        expect(text).not.toMatch(secrets);
        for (const other of ["Anna", "Ben", "Sam"].filter((player) => player !== name))
          expect(text).not.toContain(other);
        expect(reveal()).toBe(false);
        expect(hide()).toBe(true);
      }
      expect(runtime.read()).toContain("(success) Round ready");
      expect(runtime.read()).not.toMatch(/Anna|Ben|Sam|\/reveal|\/hide/);
      expect(reveal()).toBe(false);
      expect(hide()).toBe(false);
      expect(runtime.press("p1/restart").ok).toBe(true);
      expect(runtime.press("confirm/cancel").ok).toBe(true);
      expect(runtime.read()).toContain("Round ready");
      expect(runtime.press("p1/restart").ok).toBe(true);
      expect(runtime.press("confirm/confirm").ok).toBe(true);
      expect(runtime.read()).toContain("Anna");
      expect(runtime.read()).not.toMatch(secrets);
    } finally {
      runtime.dispose();
    }
  },
);

it("mounts only the current veil, omits its icon in text-only mode and offers no loading controls", () => {
  const markup = renderInstance(meta.id, examples[0], "filled", theme);
  const parts = addressedElements(markup);
  for (const part of ["card", "lock", "player", "prompt", "progress", "reveal"])
    expect(parts.has(`home/c1/${part}`), part).toBe(true);
  expect(markup).not.toMatch(secrets);
  const textOnly = addressedElements(
    renderInstance(meta.id, { ...examples[0], media: "none" }, "filled", theme),
  );
  expect(textOnly.has("home/c1/lock")).toBe(false);
  expect(textOnly.has("home/c1/reveal")).toBe(true);
  const pending = renderInstance(meta.id, examples[0], "loading", theme);
  expect(pending).toContain('aria-busy="true"');
  expect(addressedElements(pending).has("home/c1/reveal")).toBe(false);
  expect(pending).not.toMatch(secrets);
  const empty = renderInstance(meta.id, examples[0], "empty", theme);
  expect(addressedElements(empty).get("home/c1/status")?.text).toEqual([
    "Add at least three players to start",
  ]);
  const complete = renderInstance(meta.id, examples[0], "success", theme);
  expect(addressedElements(complete).get("home/c1/status")?.text).toEqual(["Round ready"]);
  expect(addressedElements(complete).has("home/c1/restart")).toBe(true);
});
