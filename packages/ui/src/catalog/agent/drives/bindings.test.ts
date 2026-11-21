import { expect, it } from "vitest";
import { z } from "zod";
import {
  components,
  hostOnlyParts,
  planAct,
  readScreen,
  type Definition,
  type Values,
} from "@lmthing/ui/catalog";

const seed = {
  group: "input",
  region: "body",
  weight: 1,
  tier: "phone",
  purpose: "",
  pick: "",
  realPath: "",
} as const;
const Draft: Definition = {
  meta: {
    ...seed,
    id: "Draft",
    parts: ["entry", "field", "choice"],
    actions: { parts: { entry: ["focus", "jump"], field: ["type"], choice: ["select"] } },
    live: { text: { field: { prop: "draft", max: 4 } } },
    selections: { choice: { prop: "selected", choices: ["one", "two"], runtime: true } },
    read: (props) => {
      const { draft, selected } = props as Values;
      return [`${JSON.stringify(draft ?? "")} ${selected ?? "none"}`];
    },
  },
  props: z.strictObject({}),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const Keys: Definition = {
  ...Draft,
  meta: {
    ...seed,
    id: "Keys",
    parts: ["jump", "pick"],
    items: { key: "keys", parts: ["root", "fill"] },
    actions: { parts: { jump: ["press"], pick: ["press"] }, items: { root: ["press"], fill: ["press"] } },
    drives: {
      commands: [
        {
          scope: "item",
          part: "root",
          to: { component: "Draft", instance: { prop: "target" }, part: "field" },
          action: "type",
          payload: { from: "letter" },
          append: true,
        },
        {
          scope: "item",
          part: "fill",
          to: { component: "Draft", instance: { prop: "target" }, part: "field" },
          action: "type",
          payload: { from: "letter" },
        },
        {
          scope: "component",
          part: "jump",
          to: { component: "Draft", instance: { prop: "target" }, part: "entry" },
          action: "jump",
        },
        {
          scope: "component",
          part: "pick",
          to: { component: "Draft", part: "choice" },
          action: "select",
          payload: { value: "two" },
        },
      ],
      observe: { from: { component: "Player", part: "scrubber" }, at: "playhead", playing: "following" },
    },
    read: (props) => {
      const { playhead, following } = props as Values;
      return [`playhead ${playhead ?? "-"} ${following ?? false}`];
    },
  },
  props: z.strictObject({ target: z.string(), keys: z.array(z.strictObject({ letter: z.string() })) }),
};
const defs = { Keys, Draft, Player: components.Player };
const keys = {
  id: "keys",
  c: "Keys",
  target: "d",
  keys: [{ letter: "A" }, { letter: "B" }, { letter: "large" }],
};
const draft = { id: "d", c: "Draft" };
const player = { id: "p", c: "Player", title: "Recording", media: "lib:fixture", seconds: 30 };
const screen = { id: "s", components: [keys, draft, player] };
const press = (part: string) => ({ address: `keys/${part}`, action: "press" });

it("routes typed presses in sequence, checks the destination value, and leaves the wire input alone", () => {
  expect(readScreen(screen, defs)).not.toContain("[keys/r3 press]");
  const result = planAct(screen, defs, {}, [press("r1"), press("r2"), press("pick"), press("jump")]);
  expect(result).toMatchObject({
    ok: true,
    changed: ['d/field type = "A"', 'd/field type = "AB"', 'd/choice select = "two"', "d/entry jump"],
    anchors: [{ address: "s/d/entry", action: "jump" }],
    links: [],
  });
  if (!result.ok) return;
  expect(readScreen(screen, defs, result.values)).toContain('d Draft "AB" two');
  expect(planAct(screen, defs, result.values, [press("r2/fill")])).toMatchObject({
    ok: true,
    values: { "s/d/$type/field": "B" },
  });
  expect(planAct(screen, defs, {}, [press("r1"), press("r3")]).ok).toBe(false);
  expect(planAct(screen, defs, {}, [{ ...press("r1"), value: "X" }])).toMatchObject({
    code: "invalid_value",
  });
});

it("does not route to ambiguous, absent, hidden, host-only, or higher-tier destinations", () => {
  const duplicate = { ...screen, components: [...screen.components, { ...draft, id: "other" }] };
  expect(readScreen(duplicate, defs)).toContain("[keys/r1 press]");
  expect(readScreen(duplicate, defs)).not.toContain("[keys/pick press]");
  const restricted = [
    { current: { ...screen, components: [keys, { ...draft, id: "other" }] }, definition: Draft },
    {
      current: { ...screen, components: [keys, { ...draft, state: "loading" as const }] },
      definition: Draft,
    },
    {
      current: screen,
      definition: { ...Draft, meta: { ...Draft.meta, ...hostOnlyParts({ parts: ["field"] }) } },
    },
    {
      current: screen,
      definition: { ...Draft, meta: { ...Draft.meta, partTiers: { field: "service" as const } } },
    },
  ];
  for (const { current, definition } of restricted) {
    const definitions = { ...defs, Draft: definition };
    expect(readScreen(current, definitions)).not.toContain("[keys/r1 press]");
    expect(planAct(current, definitions, {}, [press("r1")])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  }
});

it("observes the same Player's sampled playhead without issuing a command", () => {
  expect(readScreen(screen, defs, { "s/p/scrubber": 16, "s/p/play": true })).toContain("playhead 16 true");
  expect(readScreen(screen, defs, { "s/p/scrubber": 16, "s/p/scrubber/$privateMark": true })).toContain(
    "playhead - false",
  );
  expect(
    readScreen({ ...screen, components: [...screen.components, { ...player, id: "p2" }] }, defs),
  ).toContain("playhead - false");
});
