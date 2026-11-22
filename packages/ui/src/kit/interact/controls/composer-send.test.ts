import { expect, it, vi } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController, type AttachmentHost } from "../index";

const reply = "home/reply";
const prompt = "home/prompt";
const attach = `${reply}/attach`;
const send = (address: string) => ({ address: `${address}/send`, action: "send" });
const draft = (address: string, value: string) => ({ address: `${address}/field`, action: "type", value });

function setup(host?: AttachmentHost) {
  const screen: ScreenLike = {
    id: "home",
    components: [
      { c: "Bubbles", id: "chat", messages: [{ from: "them", text: "Hello" }] },
      { c: "Composer", id: "reply", style: "reply", hint: "Reply", attach: true, value: "Reply one" },
      { c: "Composer", id: "prompt", style: "prompt", hint: "Ask", value: "Run this" },
    ],
  };
  const onSend = vi.fn();
  const runtime = createScreenController({ screen, defs: components, onSend, attachments: host });
  const messages = () => runtime.snapshotScreen().components[0]?.messages;
  return { onSend, runtime, messages };
}

it("sends a prompt without adding a chat bubble and shows feedback until the next draft", () => {
  const { onSend, runtime, messages } = setup();
  expect(runtime.act(send(prompt)).ok).toBe(true);
  expect(onSend).toHaveBeenCalledExactlyOnceWith("Run this", `${prompt}/field`);
  expect(messages()).toEqual([{ from: "them", text: "Hello" }]);
  expect(runtime.read()).toContain("Sent");
  expect(runtime.act(draft(prompt, "Next prompt")).ok).toBe(true);
  expect(runtime.read()).not.toContain("Sent");
  expect(runtime.read()).toContain("[prompt/send send !needs-service]");
  runtime.dispose();
});

it("delivers one picked reference, only on commit, and does not reuse it for the next reply", async () => {
  const { onSend, runtime, messages } = setup({
    canRun: () => true,
    run: async () => ({ status: "accepted", reference: "picked_01" }),
  });
  expect(runtime.act({ address: attach, action: "press" }).ok).toBe(true);
  await vi.waitFor(() => expect(runtime.attachmentReference(attach)).toBe("picked_01"));
  expect(runtime.act(send(reply), { dryRun: true }).ok).toBe(true);
  expect(runtime.act([send(reply), draft(prompt, "x".repeat(2001))]).ok).toBe(false);
  expect(onSend).not.toHaveBeenCalled();
  expect(runtime.attachmentReference(attach)).toBe("picked_01");
  expect(runtime.act([send(reply), draft(reply, "Reply two"), send(reply)]).ok).toBe(true);
  expect(onSend.mock.calls).toEqual([
    ["Reply one", `${reply}/field`, undefined, ["picked_01"]],
    ["Reply two", `${reply}/field`],
  ]);
  expect(runtime.attachmentReference(attach)).toBeUndefined();
  expect(runtime.read()).not.toContain("picked_01");
  expect(JSON.stringify(runtime.snapshotScreen())).not.toContain("picked_01");
  expect(messages()).toHaveLength(3);
  expect(messages()).toContainEqual({ from: "me", text: "Reply one", attachment: { kind: "file" } });
  runtime.dispose();
});

it("cancels a pending replacement on send and never restores the consumed reference", async () => {
  let replacement: AbortSignal | undefined;
  let complete: (() => void) | undefined;
  const { onSend, runtime } = setup({
    canRun: () => true,
    run: vi
      .fn<AttachmentHost["run"]>()
      .mockResolvedValueOnce({ status: "accepted", reference: "first_file" })
      .mockImplementationOnce(({ signal }) => {
        replacement = signal;
        return new Promise((resolve) => {
          complete = () => resolve({ status: "accepted", reference: "late_file" });
        });
      }),
  });
  const pick = { address: attach, action: "press" };
  runtime.act(pick);
  await vi.waitFor(() => expect(runtime.attachmentReference(attach)).toBe("first_file"));
  runtime.act(pick);
  expect(replacement?.aborted).toBe(false);
  onSend.mockImplementation(() => expect(runtime.attachmentReference(attach)).toBeUndefined());
  expect(runtime.act(send(reply)).ok).toBe(true);
  expect(onSend).toHaveBeenCalledExactlyOnceWith("Reply one", `${reply}/field`, undefined, ["first_file"]);
  expect(replacement?.aborted).toBe(true);
  complete?.();
  await Promise.resolve();
  expect(runtime.attachmentReference(attach)).toBeUndefined();
  expect(runtime.read()).not.toContain("Attachment added");
  runtime.dispose();
});
