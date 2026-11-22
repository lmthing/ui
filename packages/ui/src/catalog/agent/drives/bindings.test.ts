import { expect, it } from "vitest";
import {
  components,
  hostOnlyParts,
  planAct,
  readScreen,
  runProbes,
  type Definition,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { Draft, Keys, defs, draft, keys, player, press, screen } from "./bindings.fixture";

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

it("hides a mounted binding when its source is disabled", () => {
  const runtime = createScreenController({ screen, defs, requireMounted: true });
  const source = "keys/r1";
  try {
    runtime.registerPart(source);
    runtime.registerPart("d/field");
    expect(runtime.read()).toContain("[keys/r1 press]");
    const enable = runtime.registerDisabledPart(source);
    expect(runtime.read()).not.toContain("[keys/r1 press]");
    expect(runtime.act(press("r1"))).toMatchObject({ ok: false, code: "disabled" });
    enable();
    expect(runtime.read()).toContain("[keys/r1 press]");
  } finally {
    runtime.dispose();
  }
});

it("appends to the linked projection rather than the raw address slot", () => {
  const linked: Definition = {
    ...Draft,
    meta: {
      ...Draft.meta,
      linkedEdits: {
        inputs: { field: { prop: "draft", max: 12 } },
        swap: { part: "swap", sides: ["field", "other"] },
        project: (_, state) => ({ draft: state.edit?.text ?? "seed" }),
      },
    },
  };
  const result = planAct(screen, { ...defs, Draft: linked }, {}, [press("r1"), press("r2")]);
  expect(result).toMatchObject({ ok: true, values: { "s/d/$linked": { edit: { text: "seedAB" } } } });
});

it("does not redirect to an implicit selection with a mounted-only value contract", () => {
  const source: Definition = {
    ...Keys,
    meta: {
      ...Keys.meta,
      drives: {
        commands: [
          {
            scope: "component",
            part: "pick",
            to: { component: "Scale", part: "l1" },
            action: "select",
            payload: { value: 2 },
          },
        ],
      },
    },
  };
  const input = { id: "s", components: [keys, { id: "scale", c: "Scale", label: "Rating" }] };
  const definitions = { Keys: source, Scale: components.Scale };
  expect(readScreen(input, definitions)).not.toContain("[keys/pick press]");
  expect(planAct(input, definitions, {}, [press("pick")]).ok).toBe(false);
});

it("composes an explicit typed sibling into a real read probe", async () => {
  const source: Definition = {
    ...Keys,
    examples: [{ target: keys.target, keys: keys.keys }],
    probes: [{ kind: "read", screen: 0, task: "Use the first key.", siblings: [draft], expect: press("r1") }],
  };
  const [result] = await runProbes({
    defs: [source, Draft],
    only: ["Keys"],
    callModel: async (prompt) => (prompt.includes("[keys/r1 press]") ? JSON.stringify(press("r1")) : ""),
  });
  expect(result).toMatchObject({ status: "pass" });
  expect(result?.prompt).toContain("d Draft");
});
