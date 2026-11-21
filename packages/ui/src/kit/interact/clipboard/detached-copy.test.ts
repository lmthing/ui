import { expect, it, vi } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore } from "../index";

it("keeps the existing detached path for other buttons unless copy confirmation is pending", () => {
  const button = components.Button!;
  const defs = {
    Button: { ...button, meta: { ...button.meta, confirmParts: ["root"] } },
    CopyFixture: {
      ...button,
      meta: {
        ...button.meta,
        id: "CopyFixture",
        confirmParts: ["root"],
        actions: { parts: { root: ["copy" as const] } },
      },
    },
  };
  const screen = {
    id: "home",
    components: [
      { id: "next", c: "Button", label: "Next", goto: "destination" },
      { id: "copy", c: "CopyFixture", label: "Copy" },
    ],
  };
  const onLink = vi.fn(),
    writeClipboard = vi.fn();
  const agent = createAgentAccess({
    defs,
    store: createInteractionStore(),
    current: () => screen,
    onLink,
    writeClipboard,
    resolveClipboardText: () => "Fixture",
  });
  const press = { address: "next", action: "press" };
  expect(agent.act(press)).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledExactlyOnceWith("destination", "home/next");
  expect(agent.act({ address: "copy", action: "copy" })).toMatchObject({ ok: true });
  expect(agent.read()).toContain("[confirm/confirm press]");
  expect(agent.act(press)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(agent.act({ address: "confirm/cancel", action: "dismiss" })).toMatchObject({ ok: true });
  expect(agent.act(press)).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledTimes(2);
  expect(writeClipboard).not.toHaveBeenCalled();
});
