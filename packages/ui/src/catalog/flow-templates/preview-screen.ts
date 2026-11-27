import type { Component } from "../types";
import type { ScreenLike } from "../agent";
import { clip } from "../cast";
import type { FilledFlow, FlowFrame } from "./fill-flow";
import type { FlowState } from "./flow-template";

export const flowScreenId = (index: number) => `step_${index + 1}`;

function fieldLabel(id: string) {
  return (id[0]!.toUpperCase() + id.slice(1)).replaceAll("_", " ");
}

function pairs(flow: FilledFlow, frame: FlowFrame) {
  return frame.fields.map((key) => ({
    label: clip(fieldLabel(key), 20),
    value: clip(String(flow.record[key]), 28),
  }));
}

function previewPart(c: string, flow: FilledFlow, frame: FlowFrame, state?: FlowState): Component[] {
  const body = frame.see;
  switch (c) {
    case "Note":
      return [
        {
          id: "note",
          c,
          text: clip(body, 120),
          ...(frame.layout && "components" in frame.layout && frame.layout.components.length > 1
            ? { emphasis: "quiet" }
            : {}),
        },
      ];
    case "Field":
      return frame.fields.map((field, i) => ({
        id: `field_${i + 1}`,
        c,
        label: clip(fieldLabel(field), 24),
        ...(state === "empty"
          ? {}
          : { value: clip(String(flow.record[field]).replaceAll(/[\r\n]/g, " "), 40) }),
      }));
    case "KeyValue":
      return [{ id: "facts", c, pairs: pairs(flow, frame) }];
    case "List":
      return [
        {
          id: "list",
          c,
          rows: pairs(flow, frame).map(({ label, value }) => ({ title: value, meta: label })),
          ...(state === "empty" ? { state: "empty" } : state === "waiting" ? { state: "loading" } : {}),
        },
      ];
    case "Success":
      return [{ id: "success", c, title: frame.title, sub: clip(body, 100) }];
    default:
      throw new Error(`Unsupported flow preview component: ${c}`);
  }
}

function previewActions(flow: FilledFlow, frame: FlowFrame, index: number, state?: FlowState): Component[] {
  if (state && state !== "success") {
    return [{ id: "reset", c: "Button", label: "Return to playback", goto: flowScreenId(index) }];
  }
  if (!frame.forward.length) {
    return [{ id: "restart", c: "Button", label: "Play again", goto: flowScreenId(0) }];
  }
  return frame.forward.map(({ label, target }, i) => {
    const next = flow.frames.findIndex(({ key }) => key === target);
    if (next < 0) throw new Error(`Preview has no target: ${target}`);
    return {
      id: `action_${i + 1}`,
      c: "Button",
      label: clip(label, 24),
      goto: flowScreenId(next),
      ...(i > 0 ? { emphasis: "quiet" } : {}),
    };
  });
}

/** Gallery fixture for a played step. Model output never writes a screen or a goto. */
export function flowPreviewScreen(flow: FilledFlow, index: number, state?: FlowState): ScreenLike {
  const frame = flow.frames[index];
  if (!frame || !("components" in frame.layout)) throw new Error(`No preview for flow step ${index}`);
  if (state && !frame.states.includes(state))
    throw new Error(`Flow step does not show ${state}: ${frame.key}`);
  const body = frame.layout.components.flatMap((c) => previewPart(c, flow, frame, state));
  if (body.some(({ c }) => c === "Success")) {
    if (frame.fields.length) body.push({ id: "facts", c: "KeyValue", pairs: pairs(flow, frame) });
  } else {
    body.unshift({ id: "header", c: "Header", title: frame.title });
    if (!body.some(({ c }) => c === "Note"))
      body.splice(1, 0, {
        id: "note",
        c: "Note",
        text: clip(frame.see, 120),
        emphasis: "quiet",
      });
  }
  const message = state && frame.messages[state];
  if (message) {
    const note = body.findIndex(({ c }) => c === "Note");
    body.splice(note < 0 ? body.length : note, note < 0 ? 0 : 1, {
      id: "message",
      c: "Note",
      text: clip(message, 120),
      ...(state === "error" ? { tone: "bad" } : {}),
    });
  }
  return {
    id: flowScreenId(index),
    title: frame.title,
    components: [...body, ...previewActions(flow, frame, index, state)],
  };
}
