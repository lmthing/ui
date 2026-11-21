import { expect, it } from "vitest";
import { components, planAct, readComponent, readScreen } from "@lmthing/ui/catalog";

const { WorkOrder, RequestResolution } = components;

it("bounds work orders and keeps incomplete or blocked orders from offering finish", () => {
  const input = WorkOrder.examples[0];
  for (const edit of [
    { to: "12:00" },
    { date: undefined },
    { note: undefined },
    { tasks: [] },
    { style: "summary" },
    { minutes: -1 },
    { parts: [{ name: "Chain", qty: 0 }] },
  ])
    expect(WorkOrder.props.safeParse({ ...input, ...edit }).success).toBe(false);
  const reading = readComponent(WorkOrder, input, "w1").join("\n");
  expect(reading).toContain("[w1/r2/check check:todo]");
  expect(reading).toContain("[w1/r3/qty set");
  expect(reading).not.toContain("w1/finish");
  const order = { id: "desk", components: [{ id: "w1", c: "WorkOrder", ...input }] };
  const edited = planAct(order, { WorkOrder }, {}, [{ address: "desk/w1/r3/qty", action: "set", value: 2 }]);
  expect(edited.ok).toBe(true);
  if (edited.ok) {
    const values = Object.fromEntries(
      Object.entries(edited.values).map(([address, value]) => [address.slice(5), value]),
    );
    expect(readComponent(WorkOrder, input, "w1", "filled", values).join("\n")).toContain(
      '"LED grow light" ×2',
    );
  }
  expect(readComponent(WorkOrder, WorkOrder.examples[1], "w1").join("\n")).not.toMatch(
    /w1\/(?:r\d+\/(?:check|qty)|clock|finish)/,
  );
  expect(
    readComponent(WorkOrder, { ...WorkOrder.examples[1], style: "worksheet" }, "w1").join("\n"),
  ).not.toMatch(/w1\/(?:r\d+\/(?:check|qty)|clock|finish)/);
});

it("requires correct resolution evidence and offers only the appropriate acceptance actions", () => {
  const [proposal, receipt] = RequestResolution.examples;
  for (const edit of [
    { outcome: "unable" },
    { duplicateOf: "SR-42" },
    { outcome: "duplicate", duplicateOf: proposal!.number, reason: "Same report" },
    { checks: [] },
    { photos: Array(5).fill("local:1") },
    { accepted: true },
  ])
    expect(RequestResolution.props.safeParse({ ...proposal, ...edit }).success).toBe(false);
  const proposed = readComponent(RequestResolution, proposal, "r1").join("\n");
  expect(proposed).not.toContain("r1/accept");
  expect(proposed).toContain('choices ["repaired","workaround"]');
  expect(proposed).toContain("photo:local:2");
  const screen = { id: "desk", components: [{ id: "r1", c: "RequestResolution", ...receipt }] };
  const defs = { RequestResolution };
  const reopen = { address: "r1/reopen", action: "press" };
  const typeReason = (value: string) => ({ address: "r1/reason", action: "type", value });
  const reading = readScreen(screen, defs);
  expect(reading).toContain("[r1/accept press !needs-people]");
  expect(reading).toContain(receipt!.reason);
  expect(reading).toContain("[r1/reason type]");
  expect(reading).not.toContain("r1/reopen");
  expect(planAct(screen, defs, {}, [reopen])).toMatchObject({ ok: false, code: "not_actionable", at: 0 });
  expect(planAct(screen, defs, {}, [typeReason(" "), reopen])).toMatchObject({
    ok: false,
    code: "not_actionable",
    at: 1,
  });
  const draft = planAct(screen, defs, {}, [typeReason("The latch still sticks.")]);
  expect(draft.ok).toBe(true);
  if (draft.ok) {
    expect(readScreen(screen, defs, draft.values)).toContain("[r1/reopen press !needs-people]");
    expect(planAct(screen, defs, draft.values, [reopen]).ok).toBe(true);
  }
  const withoutReason = { ...proposal, style: "receipt" };
  expect(readComponent(RequestResolution, withoutReason, "r1").join("\n")).not.toContain("r1/reopen");
  expect(
    readComponent(
      RequestResolution,
      { ...receipt, checks: [{ text: "Verify leak", done: false }] },
      "r1",
    ).join("\n"),
  ).not.toContain("r1/accept");
});
