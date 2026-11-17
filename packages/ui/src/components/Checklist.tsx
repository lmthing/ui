import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitCheck, KitRow, KitSkeleton, KitText, useComponentState, KitEmpty } from "../kit";

export const meta = {
  id: "Checklist",
  group: "input",
  purpose: "Things to do, with each job ticked off when done.",
  pick: "Tick off independent jobs. Not browsing and opening things (List) or following an ordered sequence (Steps).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Task completion flags stored in the on-device database.",
  items: { key: "items", parts: ["root", "check", "text", "meta"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { check: ["toggle"], root: ["toggle"] } },
  aliases: ["tasks", "todo", "ticks", "checks"],
} as const satisfies Meta;

export const props = z.strictObject({
  items: z
    .array(
      z.strictObject({
        text: text(36),
        done: z.boolean().default(false),
        meta: text(24).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 4).flatMap((item) => {
    const text = titleOf(item, 36, thing);
    return text ? [{ text, done: false }] : [];
  });
  return {
    items: items.length ? items : [0, 1, 2].map((index) => ({ text: placeholderTitle(index), done: false })),
  };
}

export const examples = [
  {
    items: [
      { text: "Water the bathroom fern", done: false, meta: "Today · Ledge" },
      { text: "Mist the monstera", done: true, meta: "Living room" },
      { text: "Turn the kitchen basil", done: false },
    ],
  },
  {
    items: [
      { text: "Clip Clover's lead", done: true },
      { text: "Pack water and a bowl", done: false, meta: "Before the morning walk" },
      { text: "Bring spare waste bags", done: false },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "things I have to do for my plants today, ticking them off",
    expect: "Checklist",
  },
  { kind: "choose", need: "browse my plants and open one", expect: "List" },
  {
    kind: "write",
    brief: "Three plant jobs for today: water the fern, mist the monstera (already done), turn the basil",
    expect: "Checklist",
  },
  {
    kind: "read",
    screen: 0,
    task: "Tick off the first job",
    expect: { address: "k1/r1/check", action: "toggle" },
  },
] satisfies Probe[];

export function Checklist({ items }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" part="root">
        <KitSkeleton rows={3} />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="text" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root">
      {items.map((it) => (
        <KitRow key={it.id} item={it.id} label={it.text} leading={<KitCheck done={it.done} part="check" />}>
          <KitText role="body" tone={it.done ? "muted" : "text"} part="text">
            {it.text}
          </KitText>
          {it.meta && (
            <KitText role="caption" tone="muted" part="meta">
              {it.meta}
            </KitText>
          )}
        </KitRow>
      ))}
    </KitCard>
  );
}
