import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  placeholderTitle,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.CardControls;
const [card] = def.examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: StateName = "filled") =>
  renderInstance("CardControls", input, state, theme);
const screen = (input: object = card) => ({
  id: "home",
  components: [{ ...input, id: "c1", c: "CardControls" }],
});

describe("CardControls schema", () => {
  it.each(def.examples)("accepts the example", (example) => {
    expect(def.props.safeParse(example).success).toBe(true);
  });
  it.each([
    { cardRef: "a".repeat(33) },
    { label: "a".repeat(25) },
    { last4: "11111" },
    { channels: { online: true, atm: false } },
    { spendCap: -1 },
    { maxCap: 0 },
    { maxCap: undefined },
    { spendCap: 251 },
    { cvv: "a".repeat(5) },
    { unlocked: true },
    { color: "#fff" },
  ])("rejects invalid values and unknown props", (patch) => {
    expect(def.props.safeParse({ ...card, ...patch }).success).toBe(false);
  });
});

describe("CardControls fallback", () => {
  const empty = { things: [], items: [] };
  const casts: CastLike[] = [
    empty,
    { things: [], items: [{ id: "card", type: "card", sample: true, title: "Supplies" }] },
    { things: [], items: [{ id: "card", type: "card", sample: true, name: 42 }] },
    { things: [], items: [{ id: "card", type: "card", sample: true, title: "a".repeat(90) }] },
  ];
  it.each(casts)("produces valid neutral props", (cast) =>
    expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true),
  );
  it("uses a neutral label with no card data", () => {
    expect(def.fallback({ cast: empty })).toMatchObject({ label: placeholderTitle(0), last4: "0000" });
  });
  it("uses a supplied cast label", () => {
    expect(def.fallback({ cast: casts[1]! }).label).toBe("Supplies");
  });
});

describe("CardControls action contract", () => {
  it("offers freeze and channel toggles and only offers controls for supplied full details", () => {
    const parts = (input: unknown) =>
      [
        ...readComponent(def, input, "c1")
          .join("\n")
          .matchAll(/\[c1\/(\w+) /g),
      ].map((offer) => offer[1]);
    expect(parts({ ...card, maskedNumber: undefined, cvv: undefined })).toEqual([
      "freeze",
      "online",
      "atm",
      "international",
      "spend_cap",
    ]);
    expect(parts({ ...card, maskedNumber: "DEMO-MASK" })).toContain("reveal");
    expect(parts({ ...card, maskedNumber: "DEMO-MASK", detail: "brief" })).toEqual([
      "freeze",
      "online",
      "atm",
      "international",
    ]);
    expect(def.meta.confirmParts).toContain("freeze");
    expect(def.meta.partTiers.reveal).toBe("ok");
  });
  it("does not disclose authored secrets in the reader", () => {
    const read = readComponent(def, { ...card, maskedNumber: "DEMO-MASK", cvv: "DEMO" }, "c1").join("\n");
    expect(read).not.toContain("DEMO-MASK");
    expect(read).not.toContain("DEMO");
  });
  it("has a core near miss and publishes only with the complete pack", () => {
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(createRegistry({ packs: ["money"] }).ids.includes("CardControls")).toBe(packReady("money"));
  });
});

describe("CardControls mounted presentation", () => {
  it("mounts switches, a slider and a locked button at the declared parts", () => {
    const html = draw(card),
      nodes = addressedElements(html);
    for (const part of [
      "root",
      "label",
      "network",
      "last4",
      "expires",
      "freeze",
      "online",
      "atm",
      "international",
      "spend_cap",
      "reveal",
    ])
      expect(nodes.has(`home/c1/${part}`), part).toBe(true);
    expect(nodes.get("home/c1/online")?.attributes).toContain('role="switch"');
    expect(nodes.get("home/c1/spend_cap")?.attributes).toContain('role="slider"');
    expect(nodes.get("home/c1/reveal")?.attributes).toContain('role="button"');
    expect(html).toContain("•••• 4821");
    expect(html).not.toContain(card.maskedNumber);
    expect(html).not.toContain(card.cvv);
  });
  it.each([
    { ...card, detail: "brief" },
    { ...card, spendCap: undefined, maskedNumber: undefined, cvv: undefined },
  ])("does not render or read absent controls", (input) => {
    const html = draw(input);
    const read = readComponent(def, input, "c1").join("\n");
    expect(html).not.toContain("home/c1/spend_cap");
    expect(html).not.toContain("home/c1/reveal");
    expect(read).not.toMatch(/spend_cap|reveal|Per-purchase limit/);
  });
  it("keeps loading inert, restores controls after success, and keeps identity after an error", () => {
    expect(draw(card, "loading")).toContain('aria-busy="true"');
    expect(draw(card, "loading")).not.toMatch(/role="(?:switch|slider|button)"/);
    expect(draw(card, "success")).toContain("Card settings updated");
    expect(draw(card, "error")).toContain("Couldn’t sync card settings");
    expect(readComponent(def, card, "c1", "loading").join("\n")).not.toMatch(/\[c1\//);
    expect(readComponent(def, card, "c1", "success").join("\n")).toContain("[c1/freeze toggle:off");
    expect(readComponent(def, card, "c1", "error").join("\n")).not.toMatch(/\[c1\//);
    expect(draw(card, "error")).toContain(card.label);
    expect(draw(card, "error")).not.toContain("home/c1/freeze");
    expect(draw(card, "success")).not.toContain(card.cvv);
  });
});

it("requires confirmation for freeze and unfreeze; changes only the addressed channel", () => {
  const onAction = vi.fn();
  const controller = createScreenController({ defs: components, screen: screen(), onAction });
  try {
    expect(controller.read()).toContain("freeze toggle:off");
    expect(controller.press("c1/freeze").ok).toBe(true);
    expect(controller.read()).toContain("confirm/cancel");
    expect(onAction).not.toHaveBeenCalled();
    expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(controller.read()).toContain("freeze toggle:off");
    expect(controller.press("c1/freeze").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.read()).toContain("freeze toggle:on");
    expect(controller.press("c1/freeze").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.read()).toContain("freeze toggle:off");
    for (const channel of ["online", "atm", "international"]) {
      expect(controller.press(`c1/${channel}`).ok).toBe(true);
    }
    expect(controller.read()).toContain("online toggle:off");
    expect(controller.read()).toContain("atm toggle:on");
    expect(controller.read()).toContain("international toggle:on");
  } finally {
    controller.dispose();
  }
});

it("enforces the supplied cap bounds and reads the resulting currency amount", () => {
  const controller = createScreenController({
    defs: components,
    screen: screen(),
    lang: "en-GB",
    currency: "GBP",
  });
  const set = (value: unknown) => controller.act({ address: "c1/spend_cap", action: "set", value });
  try {
    expect(controller.numericControl("c1/spend_cap")).toMatchObject({ min: 0, max: 250, value: 95 });
    for (const bad of [-0.01, 250.01, "100", Infinity]) expect(set(bad).ok).toBe(false);
    expect(controller.read()).toContain("Per-purchase limit: £95");
    for (const value of [0, 80.25, 250]) {
      expect(set(value).ok).toBe(true);
      expect(controller.numericControl("c1/spend_cap")).toMatchObject({ min: 0, max: 250, value });
      expect(controller.read()).toContain(`Per-purchase limit: £${value}`);
    }
  } finally {
    controller.dispose();
  }
});

it("requires a local unlock and never puts unlocked details into the reading", async () => {
  const address = "home/c1/reveal";
  const authenticateReveal = vi.fn(async () => "approved" as const);
  const controller = createScreenController({ defs: components, screen: screen(), authenticateReveal });
  try {
    expect(controller.act({ address, action: "press" }, { agent: true }).ok).toBe(false);
    expect(authenticateReveal).not.toHaveBeenCalled();
    expect(controller.revealStatus(address)).not.toBe("revealed");
    controller.registerPart(address);
    expect(controller.press(address).ok).toBe(true);
    await vi.waitFor(() => expect(controller.revealStatus(address)).toBe("revealed"));
    expect(authenticateReveal).toHaveBeenCalledWith(expect.objectContaining({ address, tier: "ok" }));
    expect(controller.read()).not.toContain(card.maskedNumber);
    expect(controller.read()).not.toContain(card.cvv);
    expect(controller.press(address).ok).toBe(true);
    expect(controller.revealStatus(address)).toBe("masked");
  } finally {
    controller.dispose();
  }
});
