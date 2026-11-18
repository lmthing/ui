import { z } from "zod";
import {
  closeLabel,
  icon,
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitIcon, KitRow, KitSheet, KitText, KitTrail } from "../kit";

export const meta = {
  id: "Sheet",
  group: "action",
  purpose: "A panel over the screen for more detail, a longer pick or a few extra actions.",
  pick: "More about one thing without leaving the screen, picking from six or more options, or a few extra actions behind the header. Not a message that stays on the screen (Banner), two to five options shown inline (Choice, Chips), or a whole new task (a new screen).",
  writeHints: [
    'Extra actions use style: "menu", with 2 to 6 items. A dangerous action has danger: true on its item. Do not use detail for actions.',
    "Detail requires a value on every fact and is the only style with action. Picker needs 6 to 12 options; only picker may use at.",
    'Example actions: {"style":"menu","title":"Fern","items":[{"label":"Edit","icon":"pencil"},{"label":"Share","icon":"share"},{"label":"Remove","icon":"trash","danger":true}]}.',
  ],
  region: "overlay",
  weight: 0,
  tier: "phone",
  realPath: "A local overlay on the current screen, opened by a link whose target is sheet.",
  items: { key: "items", parts: ["root", "icon", "label", "meta", "value"] },
  parts: ["root", "title", "sub", "close", "action"],
  states: ["filled"],
  actions: {
    parts: { close: ["dismiss"], action: ["press"] },
    items: { root: ["select", "press"] },
    // Picker options are chosen, menu items are pressed, detail facts are only read.
    when: { "root.select": { root: "select" }, "root.press": { root: "press" } },
  },
  read: (input) => {
    const value = input as z.output<typeof props>;
    return value.style === "picker" && value.at !== undefined
      ? [`${value.items[value.at]!.label} chosen`]
      : [];
  },
  aliases: ["modal", "dialog", "popup", "bottomsheet", "actionsheet", "overflow"],
} as const satisfies Meta;

const item = z.strictObject({
  label: text(28),
  meta: text(36).optional(),
  value: text(28).optional(),
  icon: icon.optional(),
  goto: screenId.optional(),
  danger: z.boolean().default(false),
});

export const props = z
  .strictObject({
    style: z.enum(["detail", "picker", "menu"]).default("detail"),
    title: text(40),
    sub: text(100).optional(),
    items: z.array(item).min(1).max(12),
    at: z.int().min(0).optional(),
    action: z.strictObject({ label: text(24), goto: screenId.optional() }).optional(),
  })
  .refine(
    ({ style, items }) => style !== "detail" || (items.length <= 6 && items.every((row) => row.value)),
    {
      path: ["items"],
      message: "Detail takes one to six facts, each with a value",
    },
  )
  .refine(({ style, items }) => style !== "picker" || items.length >= 6, {
    path: ["items"],
    message: "A picker is for six or more options; use a choice for fewer",
  })
  .refine(({ style, items }) => style !== "menu" || (items.length >= 2 && items.length <= 6), {
    path: ["items"],
    message: "A menu takes two to six items",
  })
  .refine(({ style, at, items }) => at === undefined || (style === "picker" && at < items.length), {
    path: ["at"],
    message: "At is the chosen option of a picker",
  })
  .refine(({ style, action }) => action === undefined || style === "detail", {
    path: ["action"],
    message: "Only a detail has an action",
  })
  // `root` says what an item does: a picker option is chosen, a menu item pressed, a fact only read.
  .overwrite((value) => ({
    ...value,
    // The shared reader tells an absent optional part by its explicit undefined value.
    action: value.action,
    items: value.items.map((row) => ({
      ...row,
      root: value.style === "picker" ? "select" : value.style === "menu" ? "press" : undefined,
    })),
  }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).flatMap((entry) => {
    const label = titleOf(entry, 28, thing);
    return label ? [{ label, value: label }] : [];
  });
  return {
    style: "detail",
    title: placeholderTitle(0),
    items: items.length ? items : [{ label: placeholderTitle(0), value: placeholderTitle(1) }],
  };
}

export const examples = [
  {
    style: "detail",
    title: "Morning park walk",
    sub: "With Clover and Pip",
    items: [
      { label: "When", value: "Tomorrow, 09:00" },
      { label: "Where", value: "Hyde Park" },
      { label: "Length", value: "45 minutes" },
    ],
    action: { label: "Open booking", goto: "booking" },
  },
  {
    style: "picker",
    title: "Room",
    items: ["Bathroom", "Kitchen", "Hall", "Bedroom", "Living room", "Balcony"].map((label) => ({ label })),
    at: 4,
  },
  {
    style: "menu",
    title: "Fern",
    items: [
      { label: "Edit", icon: "pencil", goto: "edit_plant" },
      { label: "Share", icon: "share" },
      { label: "Remove", icon: "trash", danger: true },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "When I tap a walk, show a panel over the list with its time, place and length, without leaving the screen",
    expect: "Sheet",
  },
  {
    kind: "choose",
    need: "Show a short strip at the top of the screen warning that today's walk was cancelled",
    expect: "Banner",
  },
  {
    kind: "write",
    brief:
      "A panel titled Fern offering three actions: Edit, Share and Remove, with Remove marked as dangerous",
    expect: "Sheet",
  },
  {
    kind: "read",
    screen: 1,
    task: "Choose Hall",
    expect: { address: "s1/r3", action: "select" },
  },
] satisfies Probe[];

export function Sheet({ style, title, sub, items, at, action }: Props<typeof props, typeof meta>) {
  return (
    <KitSheet title={title} sub={sub} closeLabel={closeLabel}>
      {items.map((row, index) => (
        <KitRow
          key={row.id}
          item={row.id}
          label={row.label}
          goto={row.goto}
          leading={
            row.icon ? <KitIcon name={row.icon} tone={row.danger ? "bad" : "muted"} part="icon" /> : undefined
          }
          trailing={
            style === "detail" ? undefined : style === "picker" && index === at ? (
              <KitTrail kind="check" />
            ) : undefined
          }
          {...(style === "detail" ? {} : { role: "button" as const })}
        >
          <KitText role="body" tone={row.danger ? "bad" : "text"} part="label">
            {row.label}
          </KitText>
          {row.meta && (
            <KitText role="caption" tone="muted" part="meta">
              {row.meta}
            </KitText>
          )}
          {row.value && (
            <KitText role="body" tone="muted" part="value">
              {row.value}
            </KitText>
          )}
        </KitRow>
      ))}
      {action && <KitAction label={action.label} kind="primary" goto={action.goto} part="action" full />}
    </KitSheet>
  );
}
