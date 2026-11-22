import { z } from "zod";
import { components, type Definition, type Values } from "@lmthing/ui/catalog";

const seed = {
  group: "input",
  region: "body",
  weight: 1,
  tier: "phone",
  purpose: "",
  pick: "",
  realPath: "",
} as const;
export const Draft: Definition = {
  meta: {
    ...seed,
    id: "Draft",
    parts: ["entry", "field", "choice"],
    actions: { parts: { entry: ["focus", "jump"], field: ["type"], choice: ["select"] } },
    live: { text: { field: { prop: "draft", max: 4 } } },
    selections: { choice: { prop: "selected", choices: ["one", "two"], runtime: true } },
    read: (props) => {
      const { draft, selected } = props as Values;
      return [`${JSON.stringify(draft ?? "")} ${selected ?? "none"}`];
    },
  },
  props: z.strictObject({}),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
export const Keys: Definition = {
  ...Draft,
  meta: {
    ...seed,
    id: "Keys",
    parts: ["jump", "pick"],
    items: { key: "keys", parts: ["root", "fill"] },
    actions: { parts: { jump: ["press"], pick: ["press"] }, items: { root: ["press"], fill: ["press"] } },
    drives: {
      commands: [
        {
          scope: "item",
          part: "root",
          to: { component: "Draft", instance: { prop: "target" }, part: "field" },
          action: "type",
          payload: { from: "letter" },
          append: true,
        },
        {
          scope: "item",
          part: "fill",
          to: { component: "Draft", instance: { prop: "target" }, part: "field" },
          action: "type",
          payload: { from: "letter" },
        },
        {
          scope: "component",
          part: "jump",
          to: { component: "Draft", instance: { prop: "target" }, part: "entry" },
          action: "jump",
        },
        {
          scope: "component",
          part: "pick",
          to: { component: "Draft", part: "choice" },
          action: "select",
          payload: { value: "two" },
        },
      ],
      observe: { from: { component: "Player", part: "scrubber" }, at: "playhead", playing: "following" },
    },
    read: (props) => {
      const { playhead, following } = props as Values;
      return [`playhead ${playhead ?? "-"} ${following ?? false}`];
    },
  },
  props: z.strictObject({ target: z.string(), keys: z.array(z.strictObject({ letter: z.string() })) }),
};
export const defs = { Keys, Draft, Player: components.Player };
export const keys = {
  id: "keys",
  c: "Keys",
  target: "d",
  keys: [{ letter: "A" }, { letter: "B" }, { letter: "large" }],
};
export const draft = { id: "d", c: "Draft" };
export const player = { id: "p", c: "Player", title: "Recording", media: "lib:fixture", seconds: 30 };
export const screen = { id: "s", components: [keys, draft, player] };
export const press = (part: string) => ({ address: `keys/${part}`, action: "press" });
