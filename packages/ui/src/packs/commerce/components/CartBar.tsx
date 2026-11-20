import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Button/secondary cannot read the live basket count and total or hide itself when the basket is empty.
export const meta = {
  id: "CartBar",
  status: "draft",
  group: "action",
  purpose: "Return to a nonempty basket from a shopping screen.",
  pick: "A persistent bottom shortcut to the basket with its live count and total, hidden when empty. Not a lone action without live basket data (Button) or the editable basket itself (Cart).",
  writeHints: ["Only supply the basket screen id. The host supplies the basket count and total."],
  region: "bottom",
  weight: 2,
  tier: "phone",
  realPath: "The count and total come from the basket on the device.",
  variants: { density: ["comfortable", "compact"], emphasis: ["normal", "quiet"] },
  parts: ["root", "count", "total", "label"],
  states: ["filled", "empty"],
  actions: { parts: { root: ["press"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  goto: c.screenId,
  ...c.variantProps(meta.variants),
});

export function fallback(): z.input<typeof props> {
  return { goto: "detail" };
}

export const examples = [
  { goto: "plant_supplies" },
  { goto: "walking_gear", density: "compact", emphasis: "quiet" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CartBar");
export const probes = [
  choose(
    "While browsing the shop, pin a shortcut to my basket at the bottom with its live item count and total. Hide the whole shortcut when empty.",
  ),
  choose("A single Continue button opening the next screen, without any count or total", "Button"),
  write(
    "Add the always-at-the-bottom basket shortcut opening the plant_supplies screen; show only when the basket has something in it.",
  ),
  read("Open my basket", { address: "c1", action: "press" }),
] satisfies c.Probe[];
