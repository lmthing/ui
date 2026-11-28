import type { OutsideSurfaceKind } from "./surface-content";

export const surfaceCopy = {
  LockScreen: { label: "Lock screen preview", note: "No reminder is scheduled." },
  Widget: { label: "Widget preview", note: "Not added to your home screen." },
  Message: { label: "Message preview", note: "No message is sent." },
} satisfies Record<OutsideSurfaceKind, { label: string; note: string }>;

export const surfaceFallback = { title: "No example content" };
