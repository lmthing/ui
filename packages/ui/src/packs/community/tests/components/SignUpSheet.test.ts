import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  themeName,
  type DeviceData,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, renderers, Screen } from "@lmthing/ui/kit";
import { addressedElements, config, renderExample, renderInstance } from "../../../../../test/render";
import { signUpRecordKind } from "../../copy";

const def = components.SignUpSheet;
const { props, meta, examples, fallback, probes } = def;
const input = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const component = "s1";
const address = (part: string) => `home/${component}/${part}`;
const members = [
  { id: "ana", name: "Ana", active: true },
  { id: "lee", name: "Lee", active: true },
  { id: "jo", name: "Jo", active: true },
  { id: "former", name: "Former member", active: false },
];
const host = (patch = {}): DeviceData => ({
  [signUpRecordKind]: [{ instance: component, viewer: "lee", members, claims: input.claims, ...patch }],
});
const screenOf = (patch = {}) => ({
  id: "home",
  components: [{ ...input, ...patch, c: meta.id, id: component }],
});

// prettier-ignore
describe("SignUpSheet contract", () => {
  it.each(examples)("accepts a real example", (example) => expect(props.safeParse(example).success).toBe(true));

  it("bounds slot and claim data and rejects derived fields", () => {
    const slots = Array.from({ length: 12 }, (_, i) => ({
      id: `slot_${i}`, title: "x".repeat(32), meta: "x".repeat(36), capacity: 12,
    }));
    const claims = slots.flatMap(({ id }) =>
      Array.from({ length: 4 }, (_, i) => ({ slotId: id, memberId: `member_${i}` })),
    );
    expect(props.safeParse({ title: "x".repeat(40), slots, claims }).success).toBe(true);
    const row = input.slots[0]!;
    for (const patch of [
      { title: "x".repeat(41) }, { title: " " }, { slots: [] }, { slots: [...slots, row] },
      { slots: [row, row] }, { claims: [...claims, { slotId: "slot_0", memberId: "extra" }], slots },
      { claims: [input.claims[0], input.claims[0]] }, { claims: [{ slotId: "missing", memberId: "ana" }] },
      { claims: [...input.claims, { slotId: "sign", memberId: "ana" }] },
      { style: "compact" }, { surface: "red" }, { viewer: "lee" }, { can_claim: true }, { color: "#fff" },
      ...[
        { id: "invalid-id" }, { id: "x".repeat(25) }, { title: "x".repeat(33) }, { meta: "x".repeat(37) },
        { capacity: 0 }, { capacity: 13 }, { capacity: 1.5 }, { expanded: false }, { remaining: 2 },
      ].map((field) => ({ slots: [{ ...row, ...field }], claims: [] })),
    ]) expect(props.safeParse({ ...input, ...patch }).success, JSON.stringify(patch)).toBe(false);
  });

  it("uses cast and neutral seeds and retains its tier and core-first probes", () => {
    const empty = { things: [], items: [] };
    const cast = (name: string | number) => ({
      things: [{ type: "contribution", fields: ["name"] }],
      items: [{ id: "table", type: "contribution", sample: true, name }],
    });
    for (const value of [empty, cast("Folding table"), cast(42)])
      expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject({ title: "Item one", slots: [{ title: "Item one" }] });
    expect(fallback({ cast: cast("Folding table") })).toMatchObject({ slots: [{ title: "Folding table" }] });
    expect(meta).toMatchObject({ status: "ready", tier: "people", dense: true, weight: 3, confirmParts: ["release", "retry_release"] });
    expect(createRegistry({ packs: ["community"] }).ids.includes(meta.id)).toBe(packReady("community"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: { address: "s1/r1", action: "toggle" } }));
  });
});

// prettier-ignore
describe("SignUpSheet parts and states", () => {
  it("shows counts, named claimants and only the permitted controls at stable addresses", () => {
    const { html, deviceData } = renderExample(meta.id, input, "filled", theme, { component });
    const parts = addressedElements(html);
    expect(parts.get(address("r1/capacity"))?.text).toEqual(["1/2"]);
    expect(parts.get(address("r1/remaining"))?.text).toEqual(["1 place left"]);
    expect(parts.get(address("r1/claimants"))?.text).toEqual(["Ana"]);
    expect(parts.get(address("r2/remaining"))?.text).toEqual(["Full"]);
    expect(parts.get(address("r2/claimants"))?.text).toEqual(["Lee"]);
    expect(parts.get(address("r1/claim"))?.attributes).toContain('role="button"');
    expect(parts.get(address("r2/release"))?.attributes).toContain('role="button"');
    expect(parts.has(address("r1/release"))).toBe(false);
    expect(parts.has(address("r2/claim"))).toBe(false);
    const reading = readComponent(def, input, component, "filled", {}, undefined, deviceData).join("\n");
    expect(reading).toContain("r1: 1/2 · 1 place left · Ana · Claim a place");
    expect(reading).toContain("[s1/r1/claim press !needs-people]");
    expect(reading).toContain("[s1/r2/release press !needs-people]");
    expect(reading).not.toContain("toggle");
  });

  it("brief hides only claimant parts, not counts or separate slot actions", () => {
    const html = renderInstance(meta.id, { ...input, detail: "brief" }, "filled", theme, { component, deviceData: host() });
    const parts = addressedElements(html);
    expect(parts.get(address("r1/root"))?.attributes).toContain('aria-expanded="false"');
    expect(parts.has(address("r1/claimants"))).toBe(false);
    expect(parts.has(address("r1/claim"))).toBe(true);
    expect(parts.has(address("r2/release"))).toBe(true);
    expect(html).not.toContain("Ana");
  });

  it.each([
    ["empty", "Nothing here yet"], ["loading", 'aria-busy="true"'],
    ["success", "Sign-up saved"], ["error", "Could not update your sign-up."],
  ] as const)("renders %s with no ordinary claim or release controls", (state, message) => {
    const { html } = renderExample(meta.id, input, state, theme, { component });
    expect(html).toContain(message);
    const buttons = [...addressedElements(html)].filter(([, { attributes }]) => attributes.includes('role="button"'));
    expect(buttons.map(([id]) => id)).toEqual(state === "error" ? [address("r1/retry_claim")] : []);
    expect(readComponent(def, input, component, state, {}, undefined, host()).join("\n")).not.toMatch(/\[s1\//);
  });
});

// prettier-ignore
it("toggles each brief row independently in render and read without changing the wire", () => {
  const screen = screenOf({ detail: "brief" });
  const runtime = createScreenController({ screen, defs: { SignUpSheet: def }, deviceData: host() });
  const draw = () => addressedElements(renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) },
      createElement(KitProvider, { theme, controller: runtime, children:
        createElement(Screen, { controller: runtime, renderers }) })),
  ));
  try {
    expect(runtime.read()).not.toMatch(/Ana|Lee/);
    expect(runtime.read()).toContain("[s1/r1 toggle:off");
    expect(runtime.press("s1/r1").ok).toBe(true);
    expect(runtime.read()).toContain("Ana");
    expect(runtime.read()).not.toContain("Lee");
    expect(runtime.read()).toContain("[s1/r1 toggle:on");
    expect(draw().get(address("r1/root"))?.attributes).toContain('aria-expanded="true"');
    expect(draw().get(address("r1/claimants"))?.text).toEqual(["Ana"]);
    expect(runtime.press("s1/r2").ok).toBe(true);
    expect(runtime.read()).toMatch(/Ana.*Lee/s);
    expect(runtime.press("s1/r1").ok).toBe(true);
    expect(runtime.read()).not.toContain("Ana");
    expect(runtime.read()).toContain("Lee");
    expect(draw().has(address("r1/claimants"))).toBe(false);
    expect(draw().get(address("r2/claimants"))?.text).toEqual(["Lee"]);
    expect(runtime.snapshotScreen()).toEqual(screen);
  } finally {
    runtime.dispose();
  }
});

// prettier-ignore
it("rejects unavailable claims and only dispatches a release after a live confirmation", () => {
  const onAction = vi.fn();
  const screen = screenOf();
  const options = { screen, defs: { SignUpSheet: def }, deviceData: host(), onAction };
  const runtime = createScreenController(options);
  try {
    for (const target of ["s1/r1", "s1/r1/release", "s1/r2/claim", "s1/r3/claim"])
      expect(runtime.press(target).ok).toBe(false);
    expect(runtime.press("s1/r1/claim").ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ address: address("r1/claim"), action: "press" });
    expect(runtime.press("s1/r2/release").ok).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(runtime.press("confirm/cancel").ok).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(runtime.press("s1/r2/release").ok).toBe(true);
    expect(runtime.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ address: address("r2/release"), action: "press" });
    expect(runtime.press("s1/r2/release").ok).toBe(true);
    options.deviceData = host({ claims: [input.claims[0]] });
    expect(runtime.confirmation).toBeUndefined();
    expect(runtime.press("confirm/confirm").ok).toBe(false);
    expect(runtime.actionsAt("s1/r2/claim")).toEqual(["press"]);
    expect(runtime.read()).toContain("r2: 0/1 · 1 place left · No one signed up yet");
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(runtime.snapshotScreen()).toEqual(screen);
  } finally {
    runtime.dispose();
  }
});

it.each([{}, host({ viewer: "former" }), host({ viewer: "visitor" }), host({ viewer: undefined })])(
  "does not offer actions to an inactive, unknown or anonymous viewer without a claim",
  (deviceData) => {
    const runtime = createScreenController({ screen: screenOf(), defs: { SignUpSheet: def }, deviceData });
    try {
      expect(runtime.read()).not.toMatch(/\/(?:claim|release) press/);
      expect(runtime.press("s1/r1/claim").ok).toBe(false);
      expect(runtime.press("s1/r2/release").ok).toBe(false);
    } finally {
      runtime.dispose();
    }
  },
);
