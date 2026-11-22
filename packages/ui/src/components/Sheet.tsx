import { useWords, KitAction, KitIcon, KitRow, KitSheet, KitText, KitTrail, useKit } from "../kit";
import { z } from "zod";
import {
  probesFor,
  icon,
  itemVariantProps,
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { prompt } from "../entry/prompt-Sheet.generated";

export const meta = {
  id: "Sheet",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "overlay",
  weight: 0,
  tier: "phone",
  realPath: "A local overlay on the current screen, opened by a link whose target is sheet.",
  variants: { detail: ["full", "brief"], lead: ["icon", "none"] },
  variantParts: { "detail.brief": { hides: ["sub", "meta"] }, "lead.none": { hides: ["icon"] } },
  items: {
    key: "items",
    parts: ["root", "icon", "label", "meta", "value", "trail"],
    variants: { tone: ["neutral", "bad"] },
  },
  select: { prop: "at", value: "index" },
  parts: ["root", "title", "sub", "close", "action"],
  states: ["filled"],
  actions: {
    parts: { close: ["dismiss"], action: ["press"] },
    items: { root: ["select", "press"] },
    // Picker options are chosen, menu items are pressed, detail facts are only read.
    when: { "root.select": { root: "select" }, "root.press": { root: "press" } },
  },
  read: (input, _state, lang) => {
    const value = input as { style: string; at?: number; items: { label: string }[] };
    return value.style === "picker" && value.at !== undefined
      ? [wordsFor(lang).chosen(value.items[value.at]!.label)]
      : [];
  },
} as const satisfies Meta;

const item = z.strictObject({
  label: text(28),
  meta: text(36).optional(),
  value: text(28).optional(),
  icon: icon.optional(),
  goto: screenId.optional(),
  ...itemVariantProps(meta.items.variants),
});

// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants), style: z.enum(["detail", "picker", "menu"]).default("detail"),
  title: text(40), sub: text(100).optional(), items: z.array(item).min(1).max(12),
  at: z.int().min(0).optional(), action: z.strictObject({ label: text(24), goto: screenId.optional() }).optional(),
})
  .refine(({ style, items }) => style !== "detail" || (items.length <= 6 && items.every((row) => row.value)),
    { path: ["items"], message: "Detail takes one to six facts, each with a value" })
  .refine(({ style, items }) => style !== "picker" || items.length >= 6,
    { path: ["items"], message: "A picker is for six or more options; use a choice for fewer" })
  .refine(({ style, items }) => style !== "menu" || (items.length >= 2 && items.length <= 6),
    { path: ["items"], message: "A menu takes two to six items" })
  .refine(({ style, at, items }) => at === undefined || (style === "picker" && at < items.length),
    { path: ["at"], message: "At is the chosen option of a picker" })
  .refine(({ style, action }) => action === undefined || style === "detail",
    { path: ["action"], message: "Only a detail has an action" })
  // `root` says what an item does: a picker option is chosen, a menu item pressed, a fact only read.
  .overwrite((value) => ({
    ...value,
    sub: value.detail === "brief" ? undefined : value.sub,
    // The shared reader tells an absent optional part by its explicit undefined value.
    action: value.action,
    items: value.items.map((row) => ({
      ...row,
      ...(value.detail === "brief" ? { meta: undefined } : {}),
      ...(value.lead === "none" ? { icon: undefined } : {}),
      root: value.style === "picker" ? "select" : value.style === "menu" ? "press" : undefined,
    })),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).flatMap((entry) => {
    const label = titleOf(entry, 28, thing);
    return label ? [{ label, value: label }] : [];
  });
  return {
    style: "detail",
    title: placeholderTitle(0, lang),
    items: items.length ? items : [{ label: placeholderTitle(0, lang), value: placeholderTitle(1, lang) }],
  };
}

const walkDetails = {
  style: "detail",
  title: "Morning park walk",
  sub: "With Clover and Pip",
  items: [
    { label: "When", value: "Tomorrow, 09:00" },
    { label: "Where", value: "Hyde Park", meta: "Meet by the south gate" },
    { label: "Length", value: "45 minutes" },
  ],
  action: { label: "Open booking", goto: "booking" },
} satisfies z.input<typeof props>;
const fernMenu = {
  style: "menu",
  title: "Fern",
  items: [
    { label: "Edit", icon: "pencil", goto: "edit_plant" },
    { label: "Share", icon: "share" },
    { label: "Remove", icon: "trash", tone: "bad" },
  ],
} satisfies z.input<typeof props>;
export const examples = [
  walkDetails,
  {
    style: "picker",
    title: "Room",
    items: ["Bathroom", "Kitchen", "Hall", "Bedroom", "Living room", "Balcony"].map((label) => ({ label })),
    at: 4,
  },
  fernMenu,
  { ...walkDetails, detail: "brief" },
  { ...walkDetails },
  { ...fernMenu, lead: "none" },
  { ...fernMenu, items: fernMenu.items.map(({ tone: _tone, ...row }) => row) },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Sheet");
export const probes = [
  choose(
    "When I tap a walk, show a panel over the list with its time, place and length, without leaving the screen",
  ),
  choose("Show a short strip at the top of the screen warning that today's walk was cancelled", "Banner"),
  write(
    "A panel titled Fern offering three actions: Edit, Share and Remove, with Remove marked as dangerous",
  ),
  {
    ...write(
      'On tap, show a panel for Fern care with the fact Water: Friday. Keep "Next visit" as its subtitle and "Use the small watering can" as the note on Water, but hide both notes from the panel.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Choose Hall", { address: "s1/r3", action: "select" }, 1),
] satisfies Probe[];

export function Sheet(input: Props<typeof props, typeof meta>) {
  const { style, title, sub, items, at, action } = input;
  const density = useKit().density;
  const { closeLabel } = useWords().words;
  return (
    <KitSheet title={title} sub={sub} closeLabel={closeLabel}>
      {items.map((row, index) => {
        const time = style === "detail" && /(?:^|\s)\d{1,2}:\d{2}\b/.test(row.value ?? "");
        return (
          <KitRow
            key={row.id}
            item={row.id}
            label={row.label}
            inset="none"
            inline={density === "compact" && style === "detail" && !row.goto}
            density={density}
            goto={row.goto}
            leading={
              row.icon ? (
                <KitIcon name={row.icon} tone={row.tone === "neutral" ? "muted" : row.tone} part="icon" />
              ) : undefined
            }
            trailing={style === "picker" && index === at ? <KitTrail kind="check" /> : undefined}
            {...(style === "detail" ? {} : { role: "button" as const })}
          >
            <KitText
              role="body"
              tone={row.tone === "neutral" ? "text" : row.tone}
              part="label"
              density={density}
            >
              {row.label}
            </KitText>
            {row.meta && (
              <KitText role="caption" tone="muted" part="meta" density={density}>
                {row.meta}
              </KitText>
            )}
            {row.value && (
              <KitText
                role={time ? "number" : "body"}
                numberScale="compact"
                tabular={time}
                tone={time ? "text" : "muted"}
                part="value"
                density={density}
              >
                {row.value}
              </KitText>
            )}
          </KitRow>
        );
      })}
      {action && <KitAction label={action.label} kind="primary" goto={action.goto} part="action" full />}
    </KitSheet>
  );
}
