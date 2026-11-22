import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  atDeviceTime,
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.SessionPack;
const { examples, fallback, meta, probes, props } = def;
const input = { ...examples[1]!, service: "Park walks", used: 8 };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const today = new Date(2026, 10, 21, 12).getTime();
const deviceData = atDeviceTime(undefined, today);
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(today);
});
afterEach(() => vi.restoreAllMocks());
const parts = (value: unknown, state: StateName = "filled") =>
  addressedElements(renderInstance("SessionPack", value, state, theme, { deviceData }));
const read = (value: unknown, state: StateName = "filled") =>
  readComponent(def, value, "c1", state, {}, undefined, deviceData).join("\n");
const controllerFor = (
  overrides: Partial<typeof input> = {},
  now = () => today,
  extra = false,
  onLink = vi.fn(),
) => {
  const pack = { ...input, ...overrides };
  const screen = { id: "home", components: [{ ...pack, id: "c1", c: "SessionPack" }] };
  if (extra)
    screen.components.push(
      { ...pack, id: "c2", c: "SessionPack" },
      { ...pack, packId: "other", id: "c3", c: "SessionPack" },
    );
  return createScreenController({ screen, defs: { SessionPack: def }, now, onLink });
};

// prettier-ignore
describe("SessionPack contract", () => {
  it.each(examples)("accepts every example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { packId: "a".repeat(25) }, { title: "a".repeat(29) }, { title: "  " }, { service: "a".repeat(28 + 1) },
    { total: 1 }, { total: 51 }, { total: 5.5 }, { used: -1 }, { used: 51 }, { used: 11 }, { used: 1.5 },
    { expires: "2026-02-29" }, { expires: "2026-01-01T00:00:00Z" }, { renewGoto: "https://example.org" },
    { style: "compact" }, { detail: "minimal" }, { remaining: 4 }, { expiry: "active" }, { color: "red" },
  ])("rejects an invalid or derived field: %o", (patch) => {
    expect(props.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("accepts the exact bounds, and defaults to the full card", () => {
    const maxText = { packId: "a".repeat(24), title: "b".repeat(28), service: "c".repeat(28) };
    expect(props.parse({ ...maxText, total: 50, used: 50, expires: "2028-02-29" })).toMatchObject({
      ...maxText,
      detail: "full",
    });
    expect(props.safeParse({ ...maxText, total: 2, used: 0 }).success).toBe(true);
  });
  it("keeps the core near miss and gates live registration at pack readiness", () => {
    const packs = ["booking"] as const;
    expect(createRegistry({ packs, includeDrafts: true }).ids).toContain("SessionPack");
    expect(createRegistry({ packs }).ids.includes("SessionPack")).toBe(packReady("booking"));
    expect(meta).toMatchObject({ tier: "phone", partTiers: { renew: "service" }, confirmParts: ["redeem", "retry"] });
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "SessionPack",
      "Progress",
    ]);
    expect(probes.filter(({ kind }) => kind === "write")).toHaveLength(2);
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(2);
  });
});

it("builds a safe fallback from a cast title and neutral placeholders", () => {
  const cast: CastLike = {
    things: [{ type: "pass", fields: ["label"] }],
    items: [{ id: "pass", type: "pass", sample: true, label: "Walk bundle" }],
  };
  const empty = { things: [], items: [] };
  const malformed = { ...cast, items: [{ ...cast.items[0]!, label: 42 }] };
  for (const source of [cast, empty, malformed])
    expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
  expect(fallback({ cast })).toMatchObject({ title: "Walk bundle", total: 2, used: 2 });
  expect(fallback({ cast: empty })).toEqual({ packId: "0", title: "Item one", total: 2, used: 2 });
  expect(fallback({ cast: malformed }).title).toBe("Item one");
  expect(read(fallback({ cast }))).not.toContain(" press");
});

describe("SessionPack states and parts", () => {
  it("uses the same visible credits, expiry and actions in the reader and the view", () => {
    const value = { ...input, expires: "2026-11-28" };
    const drawn = parts(value);
    const text = read(value);
    for (const [part, line] of [
      ["title", input.title],
      ["service", input.service],
      ["amount", "2 of 10"],
      ["expiry", "Expires soon"],
    ] as const) {
      expect(drawn.get(`home/c1/${part}`)?.text.join(" ")).toContain(line);
      expect(text).toContain(line);
    }
    for (const part of ["redeem", "renew"])
      expect(drawn.get(`home/c1/${part}`)?.attributes).toContain('role="button"');
    expect(text).toContain("[c1/redeem press]");
    expect(text).toContain("[c1/renew press→renew !needs-service]");
  });
  it("uses a compact read-only row and preserves title and expiry addresses", () => {
    const value = { ...input, expires: "2026-12-12", detail: "brief" };
    const drawn = parts(value);
    const text = read(value);
    for (const part of meta.variantParts["detail.brief"].hides)
      expect(drawn.has(`home/c1/${part}`)).toBe(false);
    for (const part of ["root", "title", "expiry", "remaining"])
      expect(drawn.has(`home/c1/${part}`)).toBe(true);
    expect(text).toContain("2 left");
    expect(text).not.toMatch(/Park walks|Credits remaining| press/);
  });
  it.each(["empty", "loading"] as const)("keeps the %s state inert", (state) => {
    const html = renderInstance("SessionPack", input, state, theme);
    expect(html).not.toContain('role="button"');
    expect(read(input, state)).not.toContain(" press");
    if (state === "empty") expect(html).toContain("Nothing here yet");
    if (state === "loading") expect(html).toContain('aria-busy="true"');
  });
  it("draws no unoffered control for expired, exhausted or nonrenewable packs", () => {
    for (const value of [
      { ...input, used: input.total },
      { ...input, expires: "2026-11-20" },
    ]) {
      expect(parts(value).has("home/c1/redeem")).toBe(false);
      expect(parts(value).has("home/c1/renew")).toBe(true);
      expect(read(value)).not.toContain("[c1/redeem");
    }
    const value = { ...input, renewGoto: undefined, service: undefined };
    expect(parts(value).has("home/c1/renew")).toBe(false);
    expect(parts(value).has("home/c1/service")).toBe(false);
    expect(read(value)).not.toContain("[c1/renew");
  });
});

describe("SessionPack dispatch", () => {
  it("confirms each redemption, shares the balance only by pack id, and stops at zero", () => {
    const controller = controllerFor({}, undefined, true);
    try {
      expect(controller.press("home/c1/redeem").ok).toBe(true);
      expect(controller.confirmation).toBeDefined();
      expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
      expect(controller.read()).toContain("2 of 10");
      for (const [address, remaining] of [
        ["c1/redeem", 1],
        ["c2/redeem", 0],
      ] as const) {
        expect(controller.press(address).ok).toBe(true);
        expect(controller.press("confirm/confirm").ok).toBe(true);
        const lines = controller.read().split("\n");
        for (const line of lines.slice(1, 3)) expect(line).toContain(`${remaining} of 10`);
        expect(lines[3]).toContain("2 of 10");
      }
      expect(controller.press("c1/redeem").ok).toBe(false);
      expect(controller.read()).toContain("Session redeemed");
    } finally {
      controller.dispose();
    }
  });
  it("rejects a pending redemption after expiry and still links to renewal", () => {
    let now = today;
    const onLink = vi.fn();
    const controller = controllerFor({ expires: "2026-11-21" }, () => now, false, onLink);
    try {
      expect(controller.press("c1/redeem").ok).toBe(true);
      now = new Date(2026, 10, 22).getTime();
      expect(controller.press("confirm/confirm").ok).toBe(false);
      expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
      expect(controller.read()).toContain("2 of 10");
      expect(controller.read()).not.toContain("[c1/redeem");
      expect(controller.press("c1/renew").ok).toBe(true);
      expect(onLink).toHaveBeenCalledExactlyOnceWith("renew", "home/c1/renew");
    } finally {
      controller.dispose();
    }
  });
});
