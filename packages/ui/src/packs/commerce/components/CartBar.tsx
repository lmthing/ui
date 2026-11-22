import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { basketSummary, cartBarLines, cartBarReading } from "../copy";
import { commerceWordsFor } from "../lang";

// Core first: Button/secondary cannot read the live basket count and total or hide itself when the basket is empty.
export const meta = {
  id: "CartBar",
  status: "ready",
  group: "action",
  purpose: "Return to a nonempty basket from a shopping screen.",
  pick: "A persistent bottom shortcut to the basket with its live count and total, hidden when empty. Not a lone action without live basket data (Button) or the editable basket itself (Cart).",
  writeHints: ["Supply the basket screen id in goto. The host supplies the basket count and total."],
  region: "bottom",
  weight: 2,
  tier: "phone",
  realPath: "The count and total come from the basket on the device.",
  variants: { emphasis: ["normal", "quiet"] },
  parts: ["root", "count", "total", "label"],
  states: ["filled", "empty"],
  actions: { parts: { root: ["press"] } },
  emptyActions: [],
  deviceData: ["basket"],
  deviceDataVisible: ({ basket }) => basketSummary(basket) !== undefined,
  previewDeviceData: ({ state }) => ({ basket: state === "filled" ? [{ count: 3, total: 24.5 }] : [] }),
  read: (_input, state, lang, data): string[] => cartBarReading(state, data?.basket, lang),
} as const satisfies c.Meta;

export const props = z.strictObject({
  goto: c.screenId,
  ...c.variantProps(meta.variants),
});

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  return { goto: c.screenId.safeParse(c.itemsOf(cast, 1)[0]?.id).data ?? "detail" };
}

export const examples = [
  { goto: "plant_supplies" },
  { goto: "walking_gear" },
  { goto: "dog_treats", emphasis: "quiet" },
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

export function CartBar(input: c.Props<typeof props, typeof meta>) {
  const { goto } = input;
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const { basket } = kit.useDeviceData();
  const { lang, words } = kit.useWords(commerceWordsFor);
  const lines = state === "filled" && cartBarLines(basket, lang, words.cartBar);
  if (!lines) return null;
  const quiet = emphasis === "quiet";
  const finish = { density, emphasis };
  const total = (
    <kit.KitText
      part="total"
      role="number"
      tone="muted"
      numberScale="compact"
      tabular
      density={density}
      emphasis="quiet"
    >
      {lines.total}
    </kit.KitText>
  );
  return (
    <kit.KitCard part="root" goto={goto} label={lines.label} padded density={density}>
      <kit.KitRow
        part={null}
        label={lines.label}
        lineRole="heading"
        density={density}
        inline
        trailing={total}
      >
        <kit.KitText
          part="label"
          role="heading"
          tone={quiet ? "text" : "accent"}
          density={density}
          emphasis={density === "compact" ? "strong" : undefined}
        >
          {lines.label}
        </kit.KitText>
        <kit.KitText part="count" role="caption" tone="muted" {...finish}>
          {lines.count}
        </kit.KitText>
      </kit.KitRow>
    </kit.KitCard>
  );
}
