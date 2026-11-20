import { expect, it, vi } from "vitest";
import type { Definition } from "../../../../catalog";
import { RequestThread } from "../../../../packs/requests";
import type { PhoneScreenProps } from "../../../screen";
import {
  actionDelivery,
  createAgentAccess,
  createInteractionStore,
  createScreenController,
} from "../../index";

const thread: Definition = {
  ...RequestThread,
  meta: {
    ...RequestThread.meta,
    live: {
      text: { field: { prop: "draft", max: 240 } },
      send: { send: { field: "field", audience: "audience" } },
      derive: ({ draft }) => ({ sendable: Boolean(String(draft ?? "").trim()) }),
    },
  },
};
const defs = { [thread.meta.id]: thread };
const screen = { id: "s", components: [{ id: "t", c: thread.meta.id, number: "41", entries: [] }] };
const select = (value: string) => ({ address: "t/audience", action: "select", value });
const type = (value: string) => ({ address: "t/field", action: "type", value });
const send = { address: "t/send", action: "send" };

it("delivers the admitted draft and audience after commit on both runtime paths", () => {
  const steps = [select("internal"), type("A"), send, select("requester"), type("B")];
  for (const mounted of [false, true]) {
    const onSend = vi.fn();
    const onAction = vi.fn();
    const store = createInteractionStore();
    const runtime = mounted
      ? createScreenController({ screen, defs, store, onSend, onAction })
      : createAgentAccess({ current: () => screen, defs, store, onSend });
    expect(runtime.act(steps, { dryRun: true }).ok).toBe(true);
    expect(runtime.act([...steps, type("x".repeat(241))]).ok).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act(steps).ok).toBe(true);
    expect(onSend).toHaveBeenCalledExactlyOnceWith("A", "s/t/field", "internal");
    if (mounted)
      expect(onAction).toHaveBeenCalledWith({
        ...send,
        address: "s/t/send",
        delivery: { text: "A", address: "s/t/field", audience: "internal" },
      });
    expect(store.get("s/t/field")).toBe("B");
    expect(store.get("s/t/$audience")).toBe("requester");
  }
});

it("exposes only runtime-created deliveries to a callback typed for PhoneScreen", () => {
  const received = vi.fn();
  const callback: NonNullable<PhoneScreenProps["onAction"]> = (action) => received(actionDelivery(action));
  const controller = createScreenController({ screen, defs, onAction: callback });
  const forged = { text: "forged", address: "s/t/field", audience: "requester" };
  const typed = { ...type("ready"), delivery: forged };
  const submitted = { ...send, delivery: forged };
  expect(controller.act([typed, select("internal"), submitted]).ok).toBe(true);
  expect(received.mock.calls).toEqual([
    [undefined],
    [undefined],
    [{ text: "ready", address: "s/t/field", audience: "internal" }],
  ]);
});
