import { describe, expect, it } from "vitest";
import { components, planAct, readComponent, type CastLike, type Definition } from "@lmthing/ui/catalog";

const { RequestQueue, RequestTriage, RequestThread, WorkOrder, RequestResolution } = components;
const cases = [
  [RequestQueue, "List"],
  [RequestTriage, "Field"],
  [RequestThread, "Bubbles"],
  [WorkOrder, "Checklist"],
  [RequestResolution, "Success"],
] as const satisfies readonly (readonly [Definition, string])[];
const empty: CastLike = { things: [], items: [] };
const matching: CastLike = {
  things: [{ type: "report", fields: ["title", "place"] }],
  items: [{ id: "first", type: "report", sample: true, title: "Cast title", place: "Cast detail" }],
};
const malformed: CastLike = {
  things: matching.things,
  items: [{ id: "first", type: "report", sample: true, title: 4, place: "  " }],
};

describe.each(cases)("$0.meta.id", (def, near) => {
  const { meta, props, fallback, examples, probes } = def as Definition;
  it("validates all examples and neutral, matching and malformed fallback casts", () => {
    expect(examples.length).toBeGreaterThanOrEqual(2);
    for (const example of examples) expect(props.safeParse(example).success).toBe(true);
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(JSON.stringify(fallback({ cast: empty }))).not.toContain("Cast title");
    expect(fallback({ cast: matching })).not.toEqual(fallback({ cast: empty }));
  });

  it("keeps strictly writable props and declares ready-safe metadata and probes", () => {
    expect(props.safeParse({ ...(examples[0] as object), color: "red" }).success).toBe(false);
    expect(meta.realPath).not.toBe("");
    for (const part of [...(meta.parts ?? []), ...(meta.items?.parts ?? [])])
      expect(part).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: meta.id }),
        expect.objectContaining({ kind: "choose", expect: near }),
        expect.objectContaining({ kind: "write", expect: meta.id }),
        expect.objectContaining({ kind: "read" }),
      ]),
    );
  });
});

it("bounds queue rows and requires a valid deadline date for the optional time", () => {
  const row = RequestQueue.examples[0]!.rows[0]!;
  for (const rows of [
    [],
    Array(7).fill(row),
    [{ ...row, status: "lost" }],
    [{ ...row, due: undefined }],
    [{ ...row, opened: "2026-02-30" }],
    [{ ...row, title: "x".repeat(33) }],
    [{ ...row, goto: "Bad link" }],
  ])
    expect(RequestQueue.props.safeParse({ rows }).success).toBe(false);
});

it("reads only the current queue in priority and deadline order without changing row addresses", () => {
  const [active, finished] = RequestQueue.examples;
  const [first, second] = active!.rows;
  const closed = finished!.rows[0]!;
  const input = {
    group: "none",
    rows: [second!, closed, first!, { ...first!, number: "LG-40", title: "Loose shelf", due: "2026-11-19" }],
  };
  const reading = readComponent(RequestQueue, input, "q1").join("\n");
  expect(reading).not.toContain(closed.title);
  expect(reading.indexOf("Loose shelf")).toBeLessThan(reading.indexOf(first!.title));
  expect(reading.indexOf(first!.title)).toBeLessThan(reading.indexOf(second!.title));
  expect(reading).toContain("[q1/r3 press→grow_light]");
  const completed = readComponent(RequestQueue, { ...input, view: "completed" }, "q1").join("\n");
  expect(completed).not.toContain(first!.title);
  expect(completed).toContain(`[q1/r2 press→${closed.goto}]`);
});

it("bounds triage routing indices and a duplicate needs a reason and a non-self target", () => {
  const input = RequestTriage.examples[1]!;
  for (const edit of [
    { queues: [] },
    { at: 1 },
    { duplicateAt: 1 },
    { reason: undefined },
    { number: input.duplicates[0]!.number },
    { reason: "x".repeat(121) },
  ])
    expect(RequestTriage.props.safeParse({ ...input, ...edit }).success).toBe(false);
});

it("keeps triage navigation separate from deciding what to apply", () => {
  const input = { ...RequestTriage.examples[1], duplicateAt: undefined };
  const screen = { id: "desk", components: [{ id: "t1", c: "RequestTriage", ...input }] };
  const defs = { RequestTriage };
  const act = (part: string, action: string, value?: number) =>
    planAct(screen, defs, {}, [{ address: `desk/t1/${part}`, action, value }]);
  expect(act("apply", "press")).toMatchObject({ ok: false, code: "not_actionable" });
  expect(act("r2", "press")).toMatchObject({ ok: true, links: [{ goto: "dog_run" }] });
  expect(act("r2/link", "select", 0)).toMatchObject({ ok: true, links: [] });
  const queue = planAct(screen, defs, {}, [
    { address: "desk/t1/r1", action: "select", value: 0 },
    { address: "desk/t1/apply", action: "press" },
  ]);
  expect(queue).toMatchObject({ ok: true, links: [] });
});

it("requires kind-specific thread details and suppresses empty sends", () => {
  const { entries, ...input } = RequestThread.examples[0]!;
  for (const entry of [
    { ...entries[0], text: "not a message" },
    { ...entries[1], goto: undefined },
    { ...entries[2], from: undefined },
    { ...entries[3], photo: "https://example.com/image" },
    { ...entries[3], text: "x".repeat(241) },
  ])
    expect(RequestThread.props.safeParse({ ...input, entries: [entry] }).success).toBe(false);
  expect(
    readComponent(RequestThread, { ...input, entries: [], draft: undefined }, "t1").join("\n"),
  ).not.toContain("t1/send");
  const text = readComponent(RequestThread, { ...input, entries }, "t1").join("\n");
  expect(text).toContain("[t1/r2 press");
  expect(text).toContain("[t1/send send !needs-people]");
});

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
  const reading = readComponent(RequestResolution, receipt, "r1").join("\n");
  expect(reading).toContain("[r1/accept press !needs-people]");
  expect(reading).toContain("[r1/reopen press !needs-people]");
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
