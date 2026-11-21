import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, type Definition } from "@lmthing/ui/catalog";
import { createScreenController, type AttachmentHost } from "@lmthing/ui/kit";

const def: Definition = {
  ...components.Button,
  meta: {
    ...components.Button.meta,
    id: "AttachmentFixture",
    actions: {
      parts: { pick: ["press"], photo: ["press"], export: ["press"], send: ["send"] },
      items: { scan: ["scan"], preview: ["press"] },
    },
    confirmParts: ["export"],
    live: { send: { send: { field: "root", attachments: ["pick", "photo"] } } },
    media: {
      attachments: {
        pick: { intent: "pick" },
        photo: { intent: "pick" },
        export: { intent: "export", source: "pick" },
      },
    },
    deviceData: ["rows"],
    items: {
      key: "rows",
      parts: ["scan", "preview"],
      deviceData: { rows: (data) => data.rows ?? [], schema: z.strictObject({ label: z.string() }) },
      media: { attachments: { scan: { intent: "scan" }, preview: { intent: "preview", source: "scan" } } },
    },
  },
  props: z.strictObject({}),
};
const defs = { AttachmentFixture: def };
const screen = { id: "s", components: [{ id: "m", c: "AttachmentFixture" }] };

function commands() {
  const complete: ((result: Awaited<ReturnType<AttachmentHost["run"]>>) => void)[] = [];
  const run = vi.fn<AttachmentHost["run"]>(() => new Promise((resolve) => complete.push(resolve)));
  return {
    run,
    host: { canRun: () => true, run },
    async accept(call: number, reference: string) {
      complete[call]!({ status: "accepted", reference });
      await Promise.resolve();
    },
  };
}

it("invalidates the export confirmation if its accepted source is replaced", async () => {
  const { run, host, accept } = commands();
  const send = vi.fn();
  const controller = createScreenController({ defs, screen, attachments: host, onSend: send });
  try {
    expect(controller.press("m/pick")).toMatchObject({ ok: true });
    await accept(0, "first");
    expect(controller.attachmentReference("m/pick")).toBe("first");
    expect(controller.press("m/pick")).toMatchObject({ ok: true });
    expect(controller.actionsAt("m/export")).toEqual(["press"]);
    expect(controller.press("m/export").ok).toBe(true);
    expect(controller.store.get("s/$confirmation")).toMatchObject({ mediaBound: true });
    expect(controller.read()).toContain("[confirm/confirm press]");
    await accept(1, "replacement");
    expect(controller.confirmation).toBeUndefined();
    expect(controller.press("confirm/confirm").ok).toBe(false);
    expect(run).toHaveBeenCalledTimes(2);
    controller.press("m/photo");
    await accept(2, "photo");
    expect(controller.press("m/send").ok).toBe(true);
    expect(send).toHaveBeenCalledExactlyOnceWith("", "s/m", undefined, ["replacement", "photo"]);
    controller.press("m/export");
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(run.mock.calls[3]![0].reference).toBe("replacement");
  } finally {
    controller.dispose();
  }
});

it("never exposes a previous row's ready result or admits its late result at a reused address", async () => {
  const { run, host, accept } = commands();
  let label = "First entry";
  const controller = createScreenController({
    defs,
    screen,
    attachments: host,
    requireMounted: true,
    get deviceData() {
      return { rows: [{ label }] };
    },
  });
  controller.registerPart("s/m/r1/scan");
  controller.registerPart("s/m/r1/preview");
  try {
    controller.press("m/r1/scan");
    await accept(0, "first_scan");
    expect(controller.attachmentReference("m/r1/scan")).toBe("first_scan");
    controller.press("m/r1/scan");
    label = "Second entry";
    controller.discardHiddenConfirmation();
    expect(run.mock.calls[1]![0].signal.aborted).toBe(true);
    await accept(1, "late_scan");
    expect(controller.actionsAt("m/r1/preview")).toEqual([]);
    expect(controller.attachmentReference("m/r1/scan")).toBeUndefined();
    expect(controller.read()).not.toMatch(/preview|:ready|first_scan|late_scan/);
    controller.press("m/r1/scan");
    await accept(2, "second_scan");
    expect(controller.attachmentReference("m/r1/scan")).toBe("second_scan");
    expect(controller.press("m/r1/preview").ok).toBe(true);
    expect(run.mock.calls[3]![0].reference).toBe("second_scan");
  } finally {
    controller.dispose();
  }
});
