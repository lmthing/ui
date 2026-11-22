import { describe, expect, it } from "vitest";
import { components, planAct, readComponent, readScreen, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { RequestThread } from "../../components";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { RequestQueue: queue, RequestThread: thread, WorkOrder: work } = components;
const screen = (c: string, input: object, state: StateName = "filled") => ({
  id: "desk",
  components: [{ c, id: "c1", ...input, state }],
});

describe("personal request queue", () => {
  const [assigned, other] = queue.examples[0]!.rows;
  const [closed] = queue.examples[1]!.rows;
  const input = { rows: [other, assigned, closed], style: "mine" };
  const data = {
    requestQueue: [
      { mine: [assigned!.number, closed!.number], mineOverflow: { active: 1 }, overflow: { active: 40 } },
    ],
  };
  const open = (row: string) => ({ address: `c1/${row}`, action: "press" });
  const completed = { address: "c1/view", action: "select", value: "completed" };

  it("filters before rendering, reading and linking, including when switching lifecycle view", () => {
    const parts = addressedElements(
      renderInstance("RequestQueue", input, "filled", theme, { deviceData: data }),
    );
    expect(parts.get("home/c1/mine")?.text).toEqual(["Assigned to me"]);
    expect(parts.get("home/c1/count")?.text).toEqual(["2 requests"]);
    expect(parts.has("home/c1/r2/root")).toBe(true);
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(parts.has("home/c1/r3/root")).toBe(false);
    const reading = readComponent(queue, input, "c1", "filled", {}, undefined, data).join("\n");
    expect(reading).toContain(assigned!.title);
    expect(reading).not.toContain(other!.title);
    const act = (...steps: Parameters<typeof planAct>[3]) =>
      planAct(screen("RequestQueue", input), components, {}, steps, null, "planner", data);
    expect(act(open("r1"))).toMatchObject({ ok: false, code: "not_actionable" });
    expect(act(open("r2"))).toMatchObject({ ok: true, links: [{ goto: assigned!.goto }] });
    expect(act(completed, open("r3"))).toMatchObject({ ok: true, links: [{ goto: closed!.goto }] });
    expect(act(completed, open("r2"))).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("fails closed when there is no assignment snapshot, with no global overflow", () => {
    const data = { requestQueue: [{ overflow: { active: 40 } }] };
    const reading = readComponent(queue, input, "c1", "filled", {}, undefined, data).join("\n");
    expect(reading).toContain("No active requests assigned to you");
    expect(reading).toContain("0 requests");
    expect(reading).not.toContain(assigned!.title);
    expect(reading).not.toContain("[c1/r2 press");
  });
});

describe("contractual SLA badge", () => {
  const sla = {
    openedAt: "2026-11-18T09:00:00Z",
    responseDueAt: "2026-11-18T12:00:00Z",
    resolutionDueAt: "2026-11-19T12:00:00Z",
  };
  const input = { rows: [{ ...queue.examples[0]!.rows[0]!, sla }] };
  const part = "home/c1/r1/sla_breached";

  it.each([
    [undefined, "2026-11-20T12:00:00Z", false],
    [sla, "2026-11-18T11:59:59Z", false],
    [sla, "2026-11-18T12:00:00Z", true],
    [{ ...sla, respondedAt: sla.responseDueAt }, "2026-11-18T12:00:00Z", false],
    [{ ...sla, respondedAt: sla.responseDueAt }, "2026-11-19T12:00:00Z", true],
    [{ ...sla, paused: true }, "2026-11-19T12:00:00Z", false],
    [{ ...sla, paused: true, respondedAt: "2026-11-18T12:01:00Z" }, "2026-11-19T12:00:00Z", true],
  ] as const)("shows only a computed missed target for %j at %s", (target, now, breached) => {
    const value = { rows: [{ ...input.rows[0], sla: target }] };
    const data = { requestQueue: [{ now: Date.parse(now) }] };
    const html = renderInstance("RequestQueue", value, "filled", theme, { deviceData: data });
    const read = readComponent(queue, value, "c1", "filled", {}, undefined, data).join("\n");
    expect(addressedElements(html).has(part)).toBe(breached);
    expect(read.includes("SLA breached")).toBe(breached);
  });

  it("accepts offset timestamps and rejects invalid chronology and authored flags", () => {
    const row = input.rows[0]!;
    expect(
      queue.props.safeParse({ rows: [{ ...row, sla: { ...sla, openedAt: "2026-11-18T11:00:00+02:00" } }] })
        .success,
    ).toBe(true);
    expect(
      queue.props.safeParse({ rows: [{ ...row, sla: { ...sla, resolutionDueAt: sla.openedAt } }] }).success,
    ).toBe(false);
    expect(queue.props.safeParse({ rows: [{ ...row, slaBreached: true }] }).success).toBe(false);
  });
});

describe("saved reply shortcut and attached files", () => {
  const [message] = thread.examples[1]!.entries;
  const entry = { ...message, file: "demo_gate_report" };
  const input = { number: "TR-06", cannedGoto: "saved_replies", entries: [entry] };
  const canned = { address: "c1/canned", action: "press" };

  it("links to saved replies without sending and is only offered to staff who can reply", () => {
    const mounted = screen("RequestThread", input);
    expect(planAct(mounted, components, {}, [canned])).toMatchObject({
      ok: true,
      links: [{ goto: "saved_replies" }],
    });
    expect(readScreen(mounted, components)).toContain("[c1/canned press→saved_replies");
    const parts = addressedElements(renderInstance("RequestThread", input, "filled", theme));
    expect(parts.get("home/c1/canned")?.attributes).toContain('role="button"');
    for (const access of [
      { role: "requester", canReply: true },
      { role: "staff", canReply: false },
      undefined,
    ] as const) {
      const defs = { RequestThread: RequestThread.bindRequestThread(() => access) };
      expect(planAct(mounted, defs, {}, [canned]).ok).toBe(false);
      expect(readScreen(mounted, defs)).not.toContain("Browse saved replies");
    }
    for (const state of ["loading", "success", "error"] as const)
      expect(planAct(screen("RequestThread", input, state), components, {}, [canned]).ok).toBe(false);
    expect(
      planAct(screen("RequestThread", { ...input, cannedGoto: undefined }), components, {}, [canned]).ok,
    ).toBe(false);
  });

  it("identifies the file without exposing its reference and keeps internal attachments private", () => {
    const markup = renderInstance("RequestThread", input, "filled", theme);
    expect(addressedElements(markup).get("home/c1/r1/file")?.text).toEqual(["Attached file"]);
    expect(markup).not.toContain(entry.file);
    const read = readScreen(screen("RequestThread", input), components);
    expect(read).toContain("Attached file");
    expect(read).not.toContain(entry.file);
    const requester = RequestThread.bindRequestThread(() => ({ role: "requester", canReply: true }));
    const privateInput = { ...input, entries: [{ ...entry, audience: "internal" }] };
    expect(readComponent(requester, privateInput, "c1").join("\n")).not.toContain("Attached file");
  });

  it("accepts only bounded opaque message references that FileList can share", () => {
    const file = {
      fileRef: entry.file,
      name: "Gate report.pdf",
      ext: "pdf",
      sizeBytes: 4100,
      status: "ready",
    };
    expect(components.FileList.props.safeParse({ files: [file] }).success).toBe(true);
    const event = thread.examples[1]!.entries[1]!;
    expect(thread.props.safeParse({ ...input, entries: [{ ...event, file: entry.file }] }).success).toBe(
      false,
    );
    for (const file of ["https://example.invalid/file", "/files/report.pdf", "x".repeat(33)])
      expect(thread.props.safeParse({ ...input, entries: [{ ...entry, file }] }).success).toBe(false);
  });
});

describe("work order asset and sign-off", () => {
  const input = work.examples[2]!;
  const sign = { address: "c1/sign_off", action: "check" };
  const finish = { address: "c1/finish", action: "press" };

  it("reads the asset and requires the live checkbox before finishing", () => {
    const controller = createScreenController({ screen: screen("WorkOrder", input), defs: components });
    const read = readScreen(screen("WorkOrder", input), components);
    const parts = addressedElements(renderInstance("WorkOrder", input, "filled", theme));
    expect(parts.get("home/c1/asset")?.text).toEqual([`Asset ${input.assetRef}`]);
    expect(parts.get("home/c1/sign_off")?.attributes).toContain('role="checkbox"');
    expect(parts.get("home/c1/finish")?.attributes).toContain('aria-disabled="true"');
    expect(read).toContain("[c1/sign_off check:todo]");
    expect(controller.act(finish).ok).toBe(false);
    expect(controller.act([sign, finish]).ok).toBe(true);
    expect(controller.act({ ...sign, value: false }).ok).toBe(true);
    expect(controller.act(finish).ok).toBe(false);
    controller.dispose();
  });

  it("keeps previous finish behavior when omitted and excludes the checkbox on inactive orders", () => {
    const legacy = { ...input, signOff: undefined, assetRef: undefined };
    const result = (value: object, state: StateName, ...steps: Parameters<typeof planAct>[3]) =>
      planAct(screen("WorkOrder", value, state), components, {}, steps);
    expect(result(legacy, "filled", finish).ok).toBe(true);
    expect(result(legacy, "filled", sign).ok).toBe(false);
    expect(result({ ...input, signOff: true }, "filled", finish).ok).toBe(true);
    for (const state of ["loading", "error", "success"] as const)
      expect(result(input, state, sign).ok).toBe(false);
    expect(result({ ...input, status: "done", style: "summary" }, "filled", sign).ok).toBe(false);
    expect(work.props.safeParse({ ...input, signOff: "yes" }).success).toBe(false);
    expect(work.props.safeParse({ ...input, assetRef: "x".repeat(33) }).success).toBe(false);
  });
});
