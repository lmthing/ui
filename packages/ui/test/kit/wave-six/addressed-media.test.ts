import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, type Definition } from "@lmthing/ui/catalog";
import { createScreenController, type AttachmentHost, type MediaAdapter } from "@lmthing/ui/kit";

const fixture: Definition = {
  ...components.Button,
  meta: {
    ...components.Button.meta,
    id: "MediaFixture",
    partTiers: { export: "ok" },
    confirmParts: ["export"],
    actions: {
      parts: {
        pick: ["press"],
        export: ["press"],
        field: ["type"],
        send: ["send"],
        clip: ["play", "pause", "stop"],
      },
      items: { scan: ["scan"], preview: ["press"], root: ["play", "pause", "stop"] },
    },
    media: {
      attachments: { pick: { intent: "pick" }, export: { intent: "export", source: "pick" } },
      playback: { clip: { video: true } },
    },
    live: {
      text: { field: { prop: "draft", max: 20 } },
      send: { send: { field: "field", attachment: "pick" } },
    },
    items: {
      key: "rows",
      parts: ["root", "scan", "preview"],
      prefix: "row",
      media: {
        attachments: { scan: { intent: "scan" }, preview: { intent: "preview", source: "scan" } },
        playback: { root: {} },
      },
    },
  },
  props: z.strictObject({
    draft: z.string().optional(),
    rows: z.array(z.strictObject({ label: z.string() })),
  }),
};
const screen = {
  id: "s",
  components: [{ id: "m", c: "MediaFixture", rows: [{ label: "A" }, { label: "B" }] }],
};
const defs = { MediaFixture: fixture };
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

it("checks availability, confirmation and transactions before host I/O, and delivers attachment-only drafts", async () => {
  const onSend = vi.fn();
  const run = vi.fn<AttachmentHost["run"]>(async ({ intent }) => ({
    status: "accepted",
    ...(intent === "pick" ? { reference: "opaque_capture" } : {}),
  }));
  const controller = createScreenController({
    defs,
    screen,
    onSend,
    attachments: { run, canRun: ({ intent }) => intent !== "scan" },
  });
  try {
    expect(controller.read()).not.toMatch(/scan|export| send/);
    expect(controller.act({ address: "m/row1/scan", action: "scan" }).ok).toBe(false);
    const pick = { address: "m/pick", action: "press" };
    expect(controller.act(pick, { dryRun: true }).ok).toBe(true);
    expect(controller.act([pick, { address: "m/send", action: "send" }]).ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press("s/m/pick").ok).toBe(true);
    expect(controller.read()).toContain("[m/pick press:pick:pending]");
    await flush();
    expect(controller.read()).toContain("[m/export press:export !needs-ok]");
    expect(controller.read()).toContain("[m/send send]");
    expect(controller.act({ address: "m/send", action: "send" }, { agent: true }).ok).toBe(true);
    expect(onSend).toHaveBeenCalledExactlyOnceWith("", "s/m/field", undefined, "opaque_capture");
    expect(controller.press("m/export").ok).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(run.mock.calls[1]![0]).toMatchObject({
      address: "s/m/export",
      source: "s/m/pick",
      intent: "export",
      reference: "opaque_capture",
    });
    await flush();
    expect(controller.read()).toContain("press:export:ready");
    expect(
      JSON.stringify([controller.read(), controller.snapshotScreen(), controller.store.snapshot()]),
    ).not.toContain("opaque_capture");
  } finally {
    controller.dispose();
  }
});

it("isolates row results and ignores superseded, unsafe and reset results", async () => {
  const complete: ((result: Awaited<ReturnType<AttachmentHost["run"]>>) => void)[] = [];
  const run = vi.fn<AttachmentHost["run"]>(() => new Promise((resolve) => complete.push(resolve)));
  const controller = createScreenController({ defs, screen, attachments: { canRun: () => true, run } });
  try {
    expect(controller.press("m/row1/scan").ok).toBe(true);
    expect(controller.press("m/row1/scan").ok).toBe(true);
    expect(run.mock.calls[0]![0].signal.aborted).toBe(true);
    complete[1]!({ status: "accepted", reference: "scan_valid" });
    complete[0]!({ status: "accepted", reference: "scan_old" });
    await flush();
    expect(controller.attachmentReference("m/row1/scan")).toBe("scan_valid");
    expect(controller.actionsAt("m/row2/preview")).toEqual([]);
    expect(controller.press("m/row1/preview").ok).toBe(true);
    expect(run.mock.calls[2]![0]).toMatchObject({ intent: "preview", reference: "scan_valid" });
    complete[2]!({ status: "accepted", reference: "/private/file" });
    await flush();
    expect(controller.read()).toContain("[m/row1/preview press:preview:error]");
    expect(controller.attachmentReference("m/row1/preview")).toBeUndefined();
    controller.press("m/row2/scan");
    controller.reset();
    expect(run.mock.calls[3]![0].signal.aborted).toBe(true);
    complete[3]!({ status: "accepted", reference: "too_late" });
    await flush();
    expect(controller.attachmentReference("m/row2/scan")).toBeUndefined();
    expect(controller.read()).not.toContain(":pending");
  } finally {
    controller.dispose();
  }
});

it("plays one addressed clip at a time and drops callbacks after switching or stopping", async () => {
  const sessions = Array.from({ length: 2 }, () => ({
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    dispose: vi.fn(),
  }));
  const open = vi.fn<MediaAdapter["open"]>((reference) => sessions[reference === "row_audio" ? 0 : 1]!);
  const controller = createScreenController({
    defs,
    screen,
    media: { open },
    resolvePlayback: (address) => ({ "s/m/row1": "row_audio", "s/m/clip": "component_video" })[address],
  });
  try {
    expect(controller.read()).toContain("[m/row1 play:stopped]");
    expect(controller.actionsAt("m/row2")).toEqual([]);
    expect(controller.act({ address: "m/row1", action: "play" }, { dryRun: true }).ok).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(controller.press("m/row1").ok).toBe(true);
    expect(controller.activeMedia("s/m/row1")).toBe(sessions[0]);
    expect(controller.press("m/row1").ok).toBe(true);
    expect(sessions[0]!.pause).toHaveBeenCalledOnce();
    expect(controller.press("m/clip").ok).toBe(true);
    expect(sessions[0]!.dispose).toHaveBeenCalledOnce();
    const callbacks = open.mock.calls[1]![1];
    expect(callbacks.video).toBe(true);
    open.mock.calls[0]![1].onError("private");
    expect(controller.read()).toContain("[m/clip play:playing]");
    callbacks.onPlaying(false);
    expect(controller.read()).toContain("[m/clip play:stopped]");
    controller.press("m/clip");
    callbacks.onError("private");
    expect(controller.read()).toContain("[m/clip play:error]");
    expect(controller.act({ address: "m/clip", action: "stop" }).ok).toBe(true);
    callbacks.onPlaying(true);
    expect(controller.activeMedia("m/clip")).toBeUndefined();
    expect(controller.read()).not.toMatch(/private|row_audio|component_video|play:playing/);
    expect(sessions[1]!.dispose).toHaveBeenCalledOnce();
  } finally {
    controller.dispose();
  }
});
