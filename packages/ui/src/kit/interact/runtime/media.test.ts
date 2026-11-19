import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components } from "@lmthing/ui/catalog";
import type { Definition } from "../../../catalog";
import { createScreenController, type MediaAdapter } from "../index";

it("rolls back newly prepared media and discards its events when sampling fails", () => {
  const fixture: Definition = {
    meta: {
      ...components.Button.meta,
      id: "ChanceFixture",
      actions: { parts: { draw: ["press"] } },
      emptyActions: ["draw.press"],
      draw: { kind: "pick", press: "draw", pool: "options" },
    },
    props: z.strictObject({ options: z.array(z.string()).min(2).max(4) }),
    examples: [],
    fallback: () => ({ options: ["A", "B"] }),
    probes: [],
  };
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const open = vi.fn<MediaAdapter["open"]>((_reference, callbacks) => {
    callbacks.onTime(4);
    return session;
  });
  const runtime = createScreenController({
    defs: { ...components, ChanceFixture: fixture },
    screen: {
      id: "s",
      components: [
        { c: "ChanceFixture", id: "c1", state: "empty", options: ["A", "B"] },
        { c: "Player", id: "p1", media: "lib:fixture", title: "Item", seconds: 30 },
      ],
    },
    media: { open },
    random: () => {
      throw new Error("No entropy");
    },
  });
  try {
    expect(
      runtime.act([
        { address: "c1/draw", action: "press" },
        { address: "p1/play", action: "play" },
      ]),
    ).toMatchObject({ ok: false, code: "random_unavailable" });
    expect(session.dispose).toHaveBeenCalledOnce();
    expect(session.play).not.toHaveBeenCalled();
    open.mock.calls[0]![1].onPlaying(true);
    expect(runtime.store.snapshot()).toEqual({});
    expect(runtime.mountMedia("p1")).toBe(session);
    expect(open).toHaveBeenCalledTimes(2);
  } finally {
    runtime.dispose();
  }
});
