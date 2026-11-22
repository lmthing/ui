import { expect, it } from "vitest";
import { createScreenController } from "@lmthing/ui/kit";
import { begin, confirm, def, fixture, initialRows, r1, r2, stop } from "./commands.fixture";

it("validates and confirms before the host runs, then projects only trusted public acknowledgement fields", async () => {
  const { agent, controller, host, calls, onAction } = fixture();
  expect(agent.read()).toContain("[control/begin start !needs-service]");
  expect(agent.act({ ...begin, value: true }).ok).toBe(false);
  expect(agent.act([begin, confirm], { dryRun: true }).ok).toBe(true);
  expect(agent.act([begin, confirm, begin]).ok).toBe(false);
  expect(host.run).not.toHaveBeenCalled();
  expect(controller.hostOperations("control")).toEqual([]);
  expect(controller.press(begin.address).ok).toBe(true);
  expect(host.run).not.toHaveBeenCalled();
  expect(agent.act(confirm).ok).toBe(true);
  expect(host.run).toHaveBeenCalledExactlyOnceWith(
    {
      address: "home/control/begin",
      action: "start",
      tier: "service",
      name: "begin",
      kind: "command",
      input: {},
    },
    { signal: calls[0]!.signal, source: "agent" },
  );
  expect(onAction).not.toHaveBeenCalled();
  expect(agent.read()).toContain("control operation begin pending");
  expect(agent.read()).toContain("[control/abort stop !needs-service]");
  expect(controller.actionsAt("control/refresh")).toEqual(["press"]);
  expect(controller.actionsAt("control/local")).toEqual([]);
  expect(agent.act(begin).ok).toBe(false);
  calls[0]!.resolve({ status: "accepted", records: [{ summary: "Finished", internal: "opaque" }] });
  await Promise.resolve();
  expect(agent.read()).toContain('control operation begin accepted [{"summary":"Finished"}]');
  expect(agent.read()).not.toContain("opaque");
  expect(controller.hostOperations("control")[0]?.records).toEqual([
    { summary: "Finished", internal: "opaque" },
  ]);
  expect(controller.snapshotScreen().components[0]).toEqual({ id: "control", c: def.meta.id });
  expect(JSON.stringify(controller.store.snapshot())).not.toContain("Finished");
});

it("cancels by row, rejects bad acknowledgements and ignores an old response after restart", async () => {
  const { agent, controller, calls } = fixture();
  expect(agent.act([r1, r2]).ok).toBe(true);
  const cancel = { address: "control/r1/abort", action: "stop" };
  expect(agent.read()).toContain("[control/r1/abort stop !needs-service]");
  expect(controller.act(cancel, { dryRun: true }).ok).toBe(true);
  expect(calls[0]!.signal.aborted).toBe(false);
  expect(controller.press(cancel.address).ok).toBe(true);
  expect(calls[0]!.signal.aborted).toBe(true);
  expect(calls[1]!.signal.aborted).toBe(false);
  expect(agent.read()).toContain("control/r1 operation begin cancelled");
  expect(agent.act(r1).ok).toBe(true);
  calls[0]!.resolve({ status: "accepted", records: [{ summary: "Late" }] });
  calls[1]!.resolve({ status: "accepted", records: [{ summary: "X".repeat(4097) }] });
  await Promise.resolve();
  expect(agent.read()).not.toContain("Late");
  expect(agent.read()).toContain("control/r1 operation begin pending");
  expect(agent.read()).toContain("control/r2 operation begin rejected");
  controller.dispose();
  expect(calls[2]!.signal.aborted).toBe(true);
});

it("does not offer unauthorised or absent handlers and does not bind old results to a replacement row", async () => {
  const { agent, controller, calls, host, setData } = fixture();
  host.allows.mockReturnValue(false);
  expect(agent.read()).not.toContain("[control/r1 start");
  expect(controller.actionsAt(r1.address)).toEqual([]);
  expect(agent.act(r1).ok).toBe(false);
  host.allows.mockReturnValue(true);
  expect(agent.act(r1).ok).toBe(true);
  setData({ targets: [{ ...initialRows[0]!, domainId: "replacement" }] });
  expect(agent.read()).not.toContain("operation begin pending");
  controller.discardHiddenConfirmation();
  expect(calls[0]!.signal.aborted).toBe(true);
  expect(agent.act(r1).ok).toBe(true);
  calls[0]!.resolve({ status: "accepted", records: [{ summary: "Wrong row" }] });
  calls[1]!.resolve({ status: "rejected", records: [{ summary: "Not available" }] });
  await Promise.resolve();
  expect(agent.read()).not.toContain("Wrong row");
  expect(agent.read()).toContain("Not available");
  controller.reset();
  expect(controller.hostOperations("control")).toEqual([]);
});

it("only offers declared loading controls and never runs an unregistered command", () => {
  const { controller, agent, host } = fixture("loading");
  expect(controller.actionsAt("control/refresh")).toEqual(["press"]);
  expect(agent.read()).toContain("[control/refresh press");
  expect(controller.press("control/refresh").ok).toBe(true);
  expect(controller.act(stop).ok).toBe(false);
  expect(controller.act(begin).ok).toBe(false);
  expect(host.run).not.toHaveBeenCalled();
  const absent = createScreenController({
    defs: { [def.meta.id]: def },
    screen: controller.snapshotScreen(),
  });
  expect(absent.read()).not.toContain("[control/begin");
  expect(absent.act(begin).ok).toBe(false);
});
