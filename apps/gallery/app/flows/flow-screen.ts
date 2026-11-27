import { flowScreenId, type FilledFlow, type ScreenLike } from "@lmthing/ui/catalog";
import { createInteractionStore } from "@lmthing/ui/kit";

export function invalidFieldStore(flow: FilledFlow, index: number) {
  const frame = flow.frames[index]!;
  if (!frame.invalidField || !frame.messages.error) return;
  const position = frame.fields.indexOf(frame.invalidField) + 1;
  if (position > 0)
    return createInteractionStore({
      [`${flowScreenId(index)}/field_${position}/field/$error`]: frame.messages.error,
    });
}

export function keepReceiptAnchor(flow: FilledFlow, index: number, screen: ScreenLike): ScreenLike {
  const frame = flow.frames[index]!;
  if (frame.receipt !== "received") return screen;
  // In the same role, acknowledgement changes the receipt in place, not the screen of the record.
  const previous = flow.frames.findIndex(
    (source) =>
      source.role === frame.role &&
      source.receipt === "waiting" &&
      source.forward.some(({ target }) => target === frame.key),
  );
  return previous >= 0 ? { ...screen, id: flowScreenId(previous) } : screen;
}
