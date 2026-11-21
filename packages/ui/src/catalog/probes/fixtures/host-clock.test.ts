import { expect, it, vi } from "vitest";
import { type Definition, type DeviceData, type Values } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { ballot, ballotFixture, opens } from "./host-projections";

const closes = (data: DeviceData, props: Readonly<Values>) => {
  const end = data.closes?.[props.chosen === "next" ? 1 : 0];
  return typeof end === "number" ? end : 0;
};

it("refreshes if a ballot opens between the initial render and mount", () => {
  const def = ballotFixture;
  const screen = { id: "s", components: [{ ...(def.examples[0] as object), id: "b", c: def.meta.id }] };
  vi.useFakeTimers({ now: opens - 1 });
  const controller = createScreenController({ screen, defs: { [def.meta.id]: def }, deviceData: ballot });
  const vote = "b/r1/vote";
  let visible = controller.canPress(vote);
  const unsubscribe = controller.store.subscribe(() => (visible = controller.canPress(vote)));
  try {
    expect(visible).toBe(false);
    vi.advanceTimersByTime(1);
    controller.mount();
    expect(visible).toBe(true);
    expect(controller.store.snapshot()).toEqual({});
  } finally {
    unsubscribe();
    controller.dispose();
    vi.useRealTimers();
  }
});

it("wakes at the closing boundary of a newly selected ballot", () => {
  const def: Definition = {
    ...ballotFixture,
    meta: {
      ...ballotFixture.meta,
      deviceData: ["viewer", "closes"],
      deviceDataFlags: {
        ...ballotFixture.meta.deviceDataFlags,
        inWindow: (data, props, now) => now < closes(data, props),
      },
      deviceDataWake: (data, props) => closes(data, props),
      selections: { ballot: { prop: "chosen", choices: ["next"], runtime: true } },
      actions: { ...ballotFixture.meta.actions, parts: { ballot: ["select"] } },
    },
  };
  const screen = {
    id: "s",
    components: [{ ...(def.examples[0] as object), id: "b", c: def.meta.id }],
  };
  vi.useFakeTimers({ now: opens });
  const controller = createScreenController({
    screen,
    defs: { [def.meta.id]: def },
    deviceData: { viewer: ballot.viewer, closes: [opens - 1, opens + 20] },
  });
  const visible: boolean[] = [];
  const vote = "b/r1/vote";
  const unsubscribe = controller.store.subscribe(() => visible.push(controller.canPress(vote)));
  try {
    controller.mount();
    expect(controller.canPress(vote)).toBe(false);
    expect(controller.act({ address: "b/ballot", action: "select", value: "next" }).ok).toBe(true);
    expect(visible).toEqual([false, true]);
    vi.advanceTimersByTime(20);
    expect(visible).toEqual([false, true, false]);
  } finally {
    unsubscribe();
    controller.dispose();
    vi.useRealTimers();
  }
});
