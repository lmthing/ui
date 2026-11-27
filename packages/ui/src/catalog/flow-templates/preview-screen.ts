import type { Component } from "../types";
import type { ScreenLike } from "../agent";
import { clip } from "../cast";
import { wordsFor } from "../lang";
import { checkScreen, type RegistryLike } from "../rules";
import type { FilledFlow, FlowFrame } from "./fill-flow";
import type { FlowState } from "./flow-template";
import { previewSearch, type FlowSearch } from "./preview-search";
import { previewSpecial } from "./preview-special";

export const flowScreenId = (index: number) => `step_${index + 1}`;

function fieldLabel(id: string) {
  if (id === "eta") return "ETA";
  return (id[0]!.toUpperCase() + id.slice(1)).replaceAll("_", " ");
}

function pairs(flow: FilledFlow, frame: FlowFrame) {
  const search = flow.frames.find((source) =>
    source.search?.results.some(({ step }) => frame.key === `${source.role}/${step}`),
  )?.search;
  const category = search?.results.find(({ step }) => frame.key === `${frame.role}/${step}`)?.category;
  return frame.fields.map((key) => ({
    label: clip(frame.labels?.[key] ?? (key === category ? search!.filterLabel : fieldLabel(key)), 20),
    value: clip(String(flow.record[key]), 28),
  }));
}

function previewTarget(flow: FilledFlow, target: string) {
  const next = flow.frames.findIndex(({ key }) => key === target);
  if (next < 0) throw new Error(`Preview has no target: ${target}`);
  return flowScreenId(next);
}

function waitlistOffer(flow: FilledFlow, frame: FlowFrame, state?: FlowState): Component[] {
  if (state) return [];
  const { respond_by } = flow.record;
  if (typeof respond_by !== "string" || frame.forward.length !== 1)
    throw new Error(`Waitlist offer needs a response deadline and one review destination: ${frame.key}`);
  return [
    {
      id: "offer",
      c: "Waitlist",
      ahead: 0,
      joined: true,
      respondBy: clip(respond_by, 36),
      goto: previewTarget(flow, frame.forward[0]!.target),
    },
  ];
}

function handoffReceipt(flow: FilledFlow, frame: FlowFrame, state?: FlowState): Component[] {
  const { subject, reference, sender, recipient } = flow.record;
  return [
    {
      id: "receipt",
      c: "HandoffReceipt",
      subject: clip(String(subject), 36),
      reference: clip(String(reference), 20),
      fromRole: clip(String(sender), 24),
      toRole: clip(String(recipient), 24),
      phase: frame.receipt,
      summary: clip((state && frame.messages[state]) || frame.see, 120),
    },
  ];
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
        label: clip(frame.labels?.[field] ?? fieldLabel(field), 24),
        ...(state === "empty" || (state === "error" && field === frame.invalidField)
          ? {}
          : { value: clip(String(flow.record[field]).replaceAll(/[\r\n]/g, " "), 40) }),
      }));
    case "KeyValue":
      return [{ id: "facts", c, pairs: pairs(flow, frame), ...(state === "empty" ? { state } : {}) }];
    case "Waitlist":
      return waitlistOffer(flow, frame, state);
    case "HandoffReceipt":
      return handoffReceipt(flow, frame, state);
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
      return [
        { id: "success", c: "Banner", text: frame.title, tone: "good" },
        { id: "note", c: "Note", text: clip(body, 120), emphasis: "quiet" },
      ];
    default:
      return previewSpecial(c, flow, frame, state);
  }
}

function previewActions(flow: FilledFlow, frame: FlowFrame, state?: FlowState): Component[] {
  if ((state && state !== "success") || !frame.forward.length || frame.thread?.compose) return [];
  const next = frame.forward.map(({ label, target }) => ({
    title: clip(label, 24),
    goto: previewTarget(flow, target),
  }));
  if (frame.receipt === "waiting" && next.length === 2) {
    const [confirm, decline] = next;
    return [
      { id: "secondary", c: "List", lead: "none", rows: [{ ...decline!, trail: "chevron" }] },
      { id: "action_1", c: "Button", label: confirm!.title, goto: confirm!.goto },
    ];
  }
  if (next.length > 1 || frame.actionList)
    return [
      { id: "choices", c: "List", lead: "none", rows: next.map((row) => ({ ...row, trail: "chevron" })) },
    ];
  return [{ id: "action_1", c: "Button", label: next[0]!.title, goto: next[0]!.goto }];
}

/** Gallery fixture for a played step. Model output never writes a screen or a goto. */
export function flowPreviewScreen(
  flow: FilledFlow,
  index: number,
  state?: FlowState,
  { validationError = false, search }: { validationError?: boolean; search?: FlowSearch } = {},
): ScreenLike {
  const frame = flow.frames[index];
  if (!frame || !("components" in frame.layout)) throw new Error(`No preview for flow step ${index}`);
  if (state && !frame.states.includes(state))
    throw new Error(`Flow step does not show ${state}: ${frame.key}`);
  if (frame.search) {
    return {
      id: flowScreenId(index),
      title: frame.title,
      components: [
        { id: "header", c: "Header", title: frame.title },
        ...previewSearch(flow, frame, (target) => previewTarget(flow, target), state, search),
      ],
    };
  }
  const body = previewBody(flow, frame, frame.layout.components, state, validationError);
  return {
    id: flowScreenId(index),
    title: frame.title,
    components: body.some(({ c }) => c === "Waitlist")
      ? body
      : [...body, ...previewActions(flow, frame, state)],
  };
}

function previewBody(
  flow: FilledFlow,
  frame: FlowFrame,
  layout: readonly string[],
  state: FlowState | undefined,
  validationError: boolean,
) {
  const body = layout.flatMap((c) => previewPart(c, flow, frame, state));
  const success = body.some(({ id }) => id === "success");
  if (success) {
    if (frame.fields.length) body.push({ id: "facts", c: "KeyValue", pairs: pairs(flow, frame) });
  } else {
    const back = frame.back && !state;
    body.unshift({
      id: "header",
      c: "Header",
      title: frame.title,
      ...(back && frame.receipt
        ? { action: { icon: "chevron_left", label: wordsFor().backLabel, goto: "back" } }
        : back
          ? { style: "back" }
          : {}),
    });
    if (
      !body.some(
        ({ c }) =>
          c === "Note" || c === "HandoffReceipt" || c === "Bubbles" || (c === "List" && frame.actionList),
      )
    )
      body.splice(1, 0, {
        id: "note",
        c: "Note",
        text: clip(frame.see, 120),
        emphasis: "quiet",
      });
  }
  const message = validationError ? frame.messages.error : state && frame.messages[state];
  if (message && !body.some(({ c }) => c === "HandoffReceipt")) {
    const note = body.findIndex(({ c }) => c === "Note");
    const composer = body.findIndex(({ c }) => c === "Composer");
    const insertAt = note >= 0 ? note : composer >= 0 ? composer : body.length;
    body.splice(insertAt, note < 0 ? 0 : 1, {
      id: note < 0 ? "message" : body[note]!.id,
      c: "Note",
      text: clip(message, 120),
      ...(state === "error" || validationError ? { tone: "bad" } : {}),
    });
  }
  return body;
}

/** Check fixture props and screen rules, without requiring isolated states to pad to a full screen. */
export function checkFlowPreview(screen: ScreenLike, defs: RegistryLike) {
  return checkScreen(screen, defs).filter(
    (issue) => issue.code !== "S.component_count" || screen.components.length >= 3,
  );
}
