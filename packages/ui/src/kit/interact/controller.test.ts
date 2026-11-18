import { describe, expect, it, vi } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "./controller";
import { createAgentAccess } from "./agent";
import type { MediaAdapter } from "./media";

const screen: ScreenLike = {
  id: "home",
  components: [
    { id: "b1", c: "Button", label: "Pick room", goto: "sheet" },
    {
      id: "b2",
      c: "Button",
      label: "Remove",
      kind: "danger",
      confirm: "Remove this recording?",
      goto: "removed",
    },
    {
      id: "s1",
      c: "Sheet",
      style: "picker",
      title: "Room",
      items: ["Hall", "Kitchen", "Bathroom", "Bedroom", "Balcony", "Living room"].map((label) => ({ label })),
    },
    { id: "p1", c: "Player", media: "lib:fixture", title: "Recording", seconds: 30, at: 5 },
  ],
};
function setup() {
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const media: MediaAdapter = { open: vi.fn(() => session) };
  const onLink = vi.fn(),
    onAction = vi.fn();
  const runtime = createScreenController({ screen, defs: components, media, onLink, onAction });
  const agent = createAgentAccess({ defs: components, current: () => screen, store: runtime.store, runtime });
  return { runtime, agent, session, media, onLink, onAction };
}

describe("screen actions", () => {
  it("opens, selects and dismisses a sheet through the public agent API", () => {
    const { agent, runtime, onLink } = setup();
    expect(agent.read()).not.toContain("s1 Sheet");
    expect(agent.act({ address: "s1/r2", action: "select" })).toMatchObject({ ok: false });
    expect(agent.act({ address: "home/b1/root", action: "press" })).toMatchObject({ ok: true });
    expect(runtime.openSheet).toBe("s1");
    expect(onLink).not.toHaveBeenCalled();
    expect(agent.read()).toContain("s1 Sheet");
    expect(agent.read()).not.toContain("b2 Button");
    expect(agent.act({ address: "b2", action: "press" })).toMatchObject({ ok: false });
    expect(agent.act({ address: "s1/r2", action: "select" })).toMatchObject({ ok: true });
    expect(agent.read()).toContain("Kitchen chosen");
    expect(agent.act({ address: "s1/close", action: "dismiss" })).toMatchObject({ ok: true });
    expect(runtime.openSheet).toBeUndefined();
    expect(agent.read()).not.toContain("s1 Sheet");
  });
  it("can open, pick and dismiss atomically and validates later steps against staged visibility", () => {
    const { agent, runtime } = setup();
    expect(
      agent.act([
        { address: "b1", action: "press" },
        { address: "s1/r3", action: "select" },
        { address: "s1/close", action: "dismiss" },
      ]),
    ).toMatchObject({ ok: true });
    expect(runtime.store.get("home/s1/at")).toBe(2);
    expect(runtime.openSheet).toBeUndefined();
  });
});
describe("screen actions", () => {
  it("asks before any dangerous action or link, and cancellation does nothing", () => {
    const { agent, runtime, onLink, onAction } = setup();
    expect(agent.act({ address: "b2", action: "press" })).toMatchObject({ ok: true });
    expect(runtime.confirmation?.message).toBe("Remove this recording?");
    expect(agent.read()).toContain("[confirm/confirm press]");
    expect(onLink).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
    expect(agent.act({ address: "p1/play", action: "play" })).toMatchObject({ ok: false });
    agent.act({ address: "confirm/cancel", action: "dismiss" });
    expect(onLink).not.toHaveBeenCalled();
    agent.act({ address: "b2", action: "press" });
    agent.act({ address: "confirm/confirm", action: "press" });
    expect(onLink).toHaveBeenCalledExactlyOnceWith("removed", "home/b2/root");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/b2/root", action: "press" });
    expect(runtime.confirmation).toBeUndefined();
    expect(agent.act({ address: "confirm/confirm", action: "press" })).toMatchObject({ ok: false });
  });
  it("dry runs and rejected batches have no UI or media effects", () => {
    const { agent, runtime, media, session, onLink } = setup();
    const steps = [
      { address: "b1", action: "press" },
      { address: "s1/r2", action: "select" },
    ];
    expect(agent.act(steps, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
    expect(runtime.openSheet).toBeUndefined();
    expect(runtime.store.snapshot()).toEqual({});
    expect(
      agent.act([
        { address: "p1/play", action: "play" },
        { address: "b1", action: "type", value: "x" },
      ]),
    ).toMatchObject({ ok: false, at: 1 });
    expect(media.open).not.toHaveBeenCalled();
    expect(session.play).not.toHaveBeenCalled();
    expect(onLink).not.toHaveBeenCalled();
    expect(agent.log()).toEqual([]);
  });
});
describe("screen actions", () => {
  it("plays, pauses, skips and seeks the host recording with bounded values", () => {
    const { agent, runtime, media, session } = setup();
    agent.act({ address: "p1/play", action: "play" });
    expect(media.open).toHaveBeenCalledWith("lib:fixture", expect.objectContaining({ video: false, at: 5 }));
    expect(session.play).toHaveBeenCalledOnce();
    expect(runtime.store.get("home/p1/play")).toBe(true);
    agent.act({ address: "p1/play", action: "pause" });
    expect(session.pause).toHaveBeenCalledOnce();
    agent.act({ address: "p1/scrubber", action: "seek", value: 12 });
    expect(session.seek).toHaveBeenLastCalledWith(12);
    expect(agent.read()).toContain("0:12");
    agent.act({ address: "p1/forward", action: "press" });
    expect(session.seek).toHaveBeenLastCalledWith(27);
    agent.act({ address: "p1/forward", action: "press" });
    expect(session.seek).toHaveBeenLastCalledWith(30);
    agent.act({ address: "p1/back", action: "press" });
    expect(session.seek).toHaveBeenLastCalledWith(15);
    expect(agent.act({ address: "p1/scrubber", action: "seek", value: 31 })).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    expect(runtime.store.get("home/p1/scrubber")).toBe(15);
  });
});
describe("screen actions", () => {
  it("updates readings from device time events and disposes playback when the screen leaves", () => {
    let notify: ((seconds: number) => void) | undefined;
    const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
    const runtime = createScreenController({
      screen,
      defs: components,
      media: {
        open: (_reference, options) => {
          notify = options.onTime;
          return session;
        },
      },
    });
    runtime.mountMedia("p1");
    notify?.(17.5);
    expect(runtime.read()).toContain("0:17");
    runtime.dispose();
    expect(session.dispose).toHaveBeenCalledOnce();
    expect(runtime.act({ address: "p1/play", action: "play" })).toMatchObject({ ok: false });
    notify?.(20);
    expect(runtime.store.get("home/p1/scrubber")).toBe(17);
  });
  it("reports unavailable recordings without pretending playback succeeded", () => {
    const runtime = createScreenController({
      screen,
      defs: components,
      media: {
        open: () => {
          throw new Error("Missing recording");
        },
      },
    });
    expect(runtime.act({ address: "p1/play", action: "play" })).toMatchObject({
      ok: false,
      code: "media_unavailable",
    });
    expect(runtime.store.snapshot()).toEqual({});
  });
});
