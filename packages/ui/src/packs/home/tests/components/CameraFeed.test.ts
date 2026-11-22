import { describe, expect, it, vi } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const def = components.CameraFeed;
const { meta, props, fallback, examples, probes } = def;
const [live, history] = examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const scope = { component: "c1", thing: "event" };
const render = (input: unknown, state: (typeof meta.states)[number] = "filled") =>
  renderInstance("CameraFeed", input, state, theme, scope);
const offers = (input: unknown, state: (typeof meta.states)[number] = "filled") =>
  affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1", {}, state).map((a) => a.address);
const runtimeFor = (input = live, onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ id: "c1", c: "CameraFeed", ...input }] },
    defs: components,
    onAction,
  });

describe("CameraFeed contract and fallback", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  const event = live!.events[0]!;
  it.each([
    { cameraId: "x".repeat(25) },
    { room: "x".repeat(21) },
    { mode: "armed" },
    { style: "preview" },
    { preview: "https://example.test/camera.jpg" },
    { events: [{ ...event, id: "x".repeat(25) }] },
    { events: [{ ...event, at: "2026-11-20T09:42:00" }] },
    { events: [{ ...event, at: "2026-02-30T09:42:00+00:00" }] },
    { events: [{ ...event, kind: "unknown" }] },
    { events: [{ ...event, color: "red" }] },
    { events: [event, event] },
    { events: Array.from({ length: 7 }, (_, n) => ({ ...event, id: `event_${n}` })) },
    { color: "red" },
  ])("rejects invalid fields and boundaries", (fields) => {
    expect(props.safeParse({ ...live, ...fields }).success).toBe(false);
  });
  it("accepts exact upper bounds and an empty event list", () => {
    expect(props.parse({ ...live, events: [] }).events).toEqual([]);
    const events = Array.from({ length: 6 }, (_, n) => ({ ...event, id: `${"x".repeat(23)}${n}` }));
    expect(
      props.parse({ ...live, cameraId: "x".repeat(24), room: "x".repeat(20), events }).events,
    ).toHaveLength(6);
  });
  it("uses cast room text or neutral fallback without inventing connection or events", () => {
    const from = (title?: unknown) =>
      props.parse(
        fallback({
          cast: {
            things: [],
            items: title === undefined ? [] : [{ id: "fern", type: "plant", sample: true, title }],
          },
        }),
      );
    expect(from("  Fern  ").room).toBe("Fern");
    for (const seed of [from(), from(24)]) {
      expect(seed).toMatchObject({
        room: "Item one",
        live: false,
        audioOn: false,
        mode: "disarmed",
        events: [],
      });
      expect(seed.preview).toBeUndefined();
    }
    expect(meta).toMatchObject({ confirmParts: ["siren"], partTiers: { talk: "ok" }, tier: "service" });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Camera" }));
    expect(probes.some((probe) => probe.kind === "write" && probe.variant?.axis === "detail")).toBe(true);
  });
});

describe("CameraFeed states and parts", () => {
  it("shows every offered control and keeps event addresses stable across detail and visual order", () => {
    const input = { ...live, events: [...live!.events].reverse() };
    const html = render(input);
    for (const address of offers(input)) {
      const path = address.split("/").length === 2 && /\/r\d+$/.test(address) ? `${address}/root` : address;
      expect(html.split(`data-testid="home/${path}"`)).toHaveLength(2);
    }
    expect(html.indexOf("home/c1/r2/root")).toBeLessThan(html.indexOf("home/c1/r1/root"));
    expect(elementAt(html, "home/c1/r2/clip")).toBeDefined();
    expect(render({ ...input, detail: "brief" })).not.toContain('data-testid="home/c1/r2/clip"');
    const reading = readComponent(def, input, "c1").join("\n");
    expect(reading).toContain("r2 Person · 20 Nov 2026 · 09:42");
    expect(reading).not.toContain("greenhouse");
  });

  it("offers only visible actions in history, privacy, offline, and loading states", () => {
    expect(offers(history)).toEqual(["c1/r1", "c1/r2"]);
    expect(render(history)).not.toContain('data-testid="home/c1/preview"');
    const privateFeed = { ...live, mode: "privacy" };
    expect(offers(privateFeed)).toEqual(["c1/mode", "c1/r1", "c1/r2"]);
    expect(render(privateFeed)).toContain("Camera is private");
    expect(render(privateFeed)).not.toContain('data-testid="home/c1/preview"');
    for (const state of ["loading", "error"] as const) {
      expect(offers(live, state)).toEqual([]);
      expect(render(live, state)).not.toMatch(/role="(radio|button)"/);
    }
    expect(render(live, "error")).toContain("Camera offline or feed unavailable");
    expect(render(live, "success")).toContain("Mode updated");
    expect(render({ ...live, events: [] })).toContain("No recent events");
    expect(render(live, "empty")).not.toContain('data-testid="home/c1/r1/root"');
  });
});

describe("CameraFeed read and act", () => {
  it("projects explicit mode selections, toggles audio, and rejects unavailable commands", () => {
    const onAction = vi.fn();
    const runtime = runtimeFor(live, onAction);
    const set = (value: string) => runtime.act({ address: "c1/mode", action: "select", value });
    const audio = { address: "c1/audio", action: "toggle" };
    expect(runtime.read()).toContain("[c1/audio toggle:off !needs-service]");
    expect(runtime.act(audio).ok).toBe(true);
    expect(runtime.read()).toContain("[c1/audio toggle:on !needs-service]");
    expect(runtime.act(audio).ok).toBe(true);
    expect(runtime.read()).toContain("[c1/audio toggle:off !needs-service]");
    expect(set("armed").ok).toBe(false);
    expect(set("privacy").ok).toBe(true);
    expect(runtime.read()).toContain("Camera is private");
    expect(runtime.act(audio).ok).toBe(false);
    expect(set("away").ok).toBe(true);
    expect(runtime.act({ address: "c1/talk", action: "press" }).ok).toBe(true);
    expect(runtime.act({ address: "c1/r1", action: "press" }).ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/r1", action: "press" });
    runtime.dispose();
  });

  it("does not dispatch siren until confirmed, including after cancelling once", () => {
    const onAction = vi.fn();
    const runtime = runtimeFor(live, onAction);
    const siren = { address: "c1/siren", action: "press" };
    expect(runtime.act(siren).ok).toBe(true);
    expect(runtime.confirmation).toBeDefined();
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act(siren).ok).toBe(true);
    expect(runtime.act({ address: "confirm/confirm", action: "press" }).ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ ...siren, address: "home/c1/siren" });
    runtime.dispose();
  });
});
