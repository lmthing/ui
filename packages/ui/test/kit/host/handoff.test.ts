import { expect, it, vi } from "vitest";
import { z } from "zod";
import { screenId, type Definition, type DeviceData, type Tier } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController, type HostCommandAdapter } from "@lmthing/ui/kit";

function fixture(uri: string, tier: Tier = "ok") {
  let data: DeviceData = { links: [{ uri }] };
  const definition = {
    meta: {
      id: "HandoffFixture",
      group: "action",
      purpose: "Open an external page.",
      pick: "Open a source.",
      region: "body",
      weight: 1,
      tier: "phone",
      partTiers: { open: tier },
      realPath: "The platform handles a web link.",
      actions: { parts: { open: ["press"], inside: ["press"] } },
      hostCommands: {
        parts: { "open.press": { kind: "external", uri: ({ props }) => String(props.uri) } },
      },
      deviceData: ["links"],
      live: { derive: (_props, _id, data) => ({ uri: (data.links?.[0] as { uri: string })?.uri }) },
    },
    props: z.strictObject({ goto: screenId }),
    fallback: () => ({ goto: "internal" }),
    examples: [],
    probes: [],
  } satisfies Definition;
  const screen = { id: "home", components: [{ id: "handoff", c: definition.meta.id, goto: "internal" }] };
  const defs = { [definition.meta.id]: definition };
  const run = vi.fn<NonNullable<HostCommandAdapter["external"]>["run"]>(() => ({ status: "accepted" }));
  const onLink = vi.fn();
  const controller = createScreenController({
    screen,
    defs,
    get deviceData() {
      return data;
    },
    hostCommands: { external: { allows: () => true, run } },
    requireMounted: true,
    onLink,
  });
  for (const address of ["handoff/open", "handoff/inside", "confirm/confirm", "confirm/cancel"])
    controller.registerPart(address);
  const agent = createAgentAccess({
    defs,
    store: controller.store,
    current: () => screen,
    runtime: controller,
  });
  return {
    agent,
    controller,
    run,
    onLink,
    setUri: (uri: string) => {
      data = { links: [{ uri }] };
    },
  };
}

const open = { address: "handoff/open", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };

it("requires a separate mounted human confirmation, uses the external result, and leaves goto unchanged", async () => {
  const { agent, controller, run, onLink } = fixture("https://EXAMPLE.test/public");
  expect(agent.read()).toContain("[handoff/open press external !needs-ok]");
  expect(agent.read()).not.toContain("example.test");
  expect(controller.act([open, confirm]).ok).toBe(false);
  expect(agent.act(open).ok).toBe(true);
  expect(agent.read()).toContain("user confirmation required");
  expect(agent.read()).not.toContain("[confirm/confirm press]");
  expect(agent.act(confirm).ok).toBe(false);
  expect(controller.act(confirm, { dryRun: true }).ok).toBe(true);
  expect(run).not.toHaveBeenCalled();
  expect(controller.press(confirm.address).ok).toBe(true);
  expect(run).toHaveBeenCalledExactlyOnceWith(
    {
      address: "home/handoff/open",
      action: "press",
      kind: "external",
      tier: "ok",
      uri: "https://example.test/public",
    },
    { source: "human", signal: expect.any(AbortSignal) },
  );
  expect(onLink).not.toHaveBeenCalled();
  expect(controller.read()).toContain("operation external pending");
  await Promise.resolve();
  expect(controller.read()).toContain("operation external accepted");
  expect(controller.press("handoff/inside").ok).toBe(true);
  expect(onLink).toHaveBeenCalledExactlyOnceWith("internal", "home/handoff/inside");
});

it("does not let a changed URI inherit the previous confirmation", () => {
  const { controller, setUri, run } = fixture("https://example.test/first");
  expect(controller.act(open).ok).toBe(true);
  setUri("https://example.test/second");
  expect(controller.act(confirm).ok).toBe(false);
  expect(run).not.toHaveBeenCalled();
  expect(controller.act(cancel).ok).toBe(true);
  expect(controller.act(open).ok).toBe(true);
  expect(controller.act(confirm).ok).toBe(true);
  expect(run.mock.calls[0]?.[0].uri).toBe("https://example.test/second");
});

it.each([
  "javascript:alert(1)",
  "file:///tmp/sensitive",
  "http://example.test",
  "//example.test",
  "https:///example.test",
  "https://user:pass@example.test",
  "https://@example.test",
  "https://example.test\\evil.test",
  "https://example.test/\nembedded",
  `https://example.test/${"x".repeat(2048)}`,
])("does not offer or hand off rejected URI %s", (uri) => {
  const { controller, run, onLink } = fixture(uri);
  expect(controller.read()).not.toContain("[handoff/open");
  expect(controller.actionsAt(open.address)).toEqual([]);
  expect(controller.act(open).ok).toBe(false);
  expect(run).not.toHaveBeenCalled();
  expect(onLink).not.toHaveBeenCalled();
});

it("does not promote a phone-only action to an external effect", () => {
  const { controller, run } = fixture("https://example.test", "phone");
  expect(controller.act(open).ok).toBe(false);
  expect(run).not.toHaveBeenCalled();
});
