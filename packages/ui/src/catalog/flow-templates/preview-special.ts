import { clip } from "../cast";
import type { Component } from "../types";
import type { FilledFlow, FlowFrame } from "./fill-flow";
import type { FlowState } from "./flow-template";

export function previewSpecial(
  c: string,
  { record }: FilledFlow,
  frame: FlowFrame,
  state?: FlowState,
): Component[] {
  const get = (key: string, length: number) => clip(String(record[key]), length);
  switch (c) {
    case "Bubbles":
      if (state === "empty") return [];
      return [
        {
          id: "thread",
          c,
          messages: frame.thread!.messages.map(({ field, ...message }) => ({
            ...message,
            text: get(field, 120),
          })),
        },
      ];
    case "Composer":
      if (state === "empty") return [];
      return [
        {
          id: "composer",
          c,
          style: "reply",
          label: frame.labels?.[frame.thread!.compose!],
          hint: frame.labels?.[frame.thread!.compose!] ?? frame.title,
          value: get(frame.thread!.compose!, 120),
          max: 120,
          detail: "brief",
        },
      ];
    case "Steps":
      return [{ id: "steps", c, style: "bar", ...frame.progress }];
    case "Profile":
      return state === "empty" ? [] : [profilePreview(record)];
    case "Choice": {
      const { field, options } = frame.choice!;
      const at = options.findIndex((key) => record[key] === record[field]);
      return [
        {
          id: "choice",
          c,
          options: options.map((key) => ({ title: get(key, 28) })),
          ...(at >= 0 ? { at } : {}),
        },
      ];
    }
    default:
      throw new Error(`Unsupported flow preview component: ${c}`);
  }
}

function profilePreview(record: FilledFlow["record"]): Component {
  const photo =
    record.photo_action === record.remove_photo
      ? undefined
      : record.photo_action === record.retake_photo
        ? record.replacement_photo
        : record.current_photo;
  return {
    id: "profile",
    c: "Profile",
    name: clip(String(record.display_name), 32),
    meta: clip(String(record.profile_context), 48),
    ...(typeof photo === "string" && /^lib:[a-z0-9_]+$/.test(photo) ? { photo } : { media: "none" }),
  };
}
