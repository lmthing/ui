import { describe, expect, it } from "vitest";
import { components, planAct, readComponent, readScreen, type StateName } from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { RequestThread } from "../../components";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const thread = components.RequestThread;
const screen = (c: string, input: object, state: StateName = "filled") => ({
  id: "desk",
  components: [{ c, id: "c1", ...input, state }],
});

const [message] = thread.examples[1]!.entries;
const entry = { ...message, file: "demo_gate_report" };
const input = { number: "TR-06", cannedGoto: "saved_replies", entries: [entry] };

describe("saved reply shortcut", () => {
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
});

describe("thread file attachments", () => {
  it("identifies the file without exposing its reference and keeps internal attachments private", () => {
    const deviceData = { requestFiles: [{ fileRef: entry.file, name: "Gate inspection.pdf" }] };
    const markup = renderInstance("RequestThread", input, "filled", theme, { deviceData });
    expect(addressedElements(markup).get("home/c1/r1/file")?.text).toEqual([
      "Attached file: Gate inspection.pdf",
    ]);
    expect(markup).not.toContain(entry.file);
    const read = readComponent(thread, input, "c1", "filled", {}, undefined, deviceData).join("\n");
    expect(read).toContain("Attached file: Gate inspection.pdf");
    expect(read).not.toContain(entry.file);
    const requester = RequestThread.bindRequestThread(() => ({ role: "requester", canReply: true }));
    const privateInput = { ...input, entries: [{ ...entry, audience: "internal" }] };
    expect(
      readComponent(requester, privateInput, "c1", "filled", {}, undefined, deviceData).join("\n"),
    ).not.toMatch(/Attached file|Gate inspection/);
    expect(readComponent(thread, input, "c1").join("\n")).toContain("Attached file");
  });

  it("accepts only bounded opaque message references that FileList can share", () => {
    const file = {
      fileRef: "report.v2",
      name: "Gate report.pdf",
      ext: "pdf",
      sizeBytes: 4100,
      status: "ready",
    };
    expect(components.FileList.props.safeParse({ files: [file] }).success).toBe(true);
    expect(thread.props.safeParse({ ...input, entries: [{ ...entry, file: file.fileRef }] }).success).toBe(
      true,
    );
    const event = thread.examples[1]!.entries[1]!;
    expect(thread.props.safeParse({ ...input, entries: [{ ...event, file: entry.file }] }).success).toBe(
      false,
    );
    for (const ref of ["https://example.invalid/file", "/files/report.pdf", "x".repeat(33)]) {
      expect(components.FileList.props.safeParse({ files: [{ ...file, fileRef: ref }] }).success).toBe(false);
      expect(thread.props.safeParse({ ...input, entries: [{ ...entry, file: ref }] }).success).toBe(false);
    }
  });
});

it("can insert a saved reply into the opted-in staff draft without sending", () => {
  const { templates, categories } = components.CannedReplies.examples[0]!;
  const replies = { c: "CannedReplies", id: "replies", templates, categories };
  const opened = (input: object) => {
    const target = { ...screen("RequestThread", input), id: "saved_replies" };
    return { ...target, components: [replies, ...target.components] };
  };
  const insert = { address: "replies/r1/insert", action: "press" };
  const target = opened(input);
  const staged = planAct(target, components, {}, [insert]);
  expect(staged).toMatchObject({
    ok: true,
    values: { "saved_replies/c1/$type/field": templates[0]!.body },
    links: [],
  });
  if (!staged.ok) return;
  expect(readScreen(target, components, staged.values)).toContain("send !needs-people");
  expect(planAct(opened({ ...input, cannedGoto: undefined }), components, {}, [insert]).ok).toBe(false);
  const requester = RequestThread.bindRequestThread(() => ({ role: "requester", canReply: true }));
  expect(planAct(target, { ...components, RequestThread: requester }, {}, [insert]).ok).toBe(false);
});
