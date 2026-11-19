import { z } from "zod";
import {
  probesFor,
  itemsOf,
  itemVariantProps,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitCard,
  KitCheck,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  KitEmpty,
  useVariant,
} from "../kit";

export const meta = {
  id: "Checklist",
  signature: "check_burst",
  group: "input",
  purpose: "Things to do, with each job ticked off when done.",
  pick: "Tick off independent jobs. Not browsing and opening things (List) or following an ordered sequence (Steps).",
  writeHints: [
    'For task names and checkboxes only, set detail to "brief"; keep any supplied notes in meta. This does not change density or mark. When they are not requested, write "density":null and "mark":null, not their named defaults.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Task completion flags stored in the on-device database.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  items: {
    key: "items",
    parts: ["root", "check", "text", "meta"],
    variants: { mark: ["none", "highlight"] },
  },
  variantParts: { "detail.brief": { hides: ["meta"] } },
  states: ["filled", "empty", "loading"],
  actions: { items: { check: ["check"] } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    items: z
      .array(
        z.strictObject({
          ...itemVariantProps(meta.items.variants),
          text: text(36),
          done: z.boolean().default(false),
          meta: text(24).optional(),
        }),
      )
      .min(1)
      .max(6),
  })
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, items: value.items.map((item) => ({ ...item, meta: undefined })) }
      : value,
  );

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 4).flatMap((item) => {
    const text = titleOf(item, 36, thing);
    return text ? [{ text, done: false }] : [];
  });
  return {
    items: items.length
      ? items
      : [0, 1, 2].map((index) => ({ text: placeholderTitle(index, lang), done: false })),
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
  {
    detail: "brief",
    items: [
      { text: "Water the fern", mark: "highlight" },
      { text: "Mist the monstera" },
      { text: "Turn the basil" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Checklist");
export const probes = [
  choose("things I have to do for my plants today, ticking them off"),
  choose("browse my plants and open one", "List"),
  write("Three plant jobs for today: water the fern, mist the monstera (already done), turn the basil"),
  {
    ...write(
      "Give me checkboxes for Water the fern and Mist the monstera. Show the task names only, without their room notes Bathroom and Living room.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Tick off the first job", { address: "k1/r1/check", action: "check" }),
] satisfies Probe[];

export function Checklist(input: Props<typeof props, typeof meta>) {
  const { items } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" part="root" density={density}>
        <KitSkeleton
          rows={items.length}
          lead="box"
          density={density}
          items={items.map(({ text, meta }) => ({ title: text, meta }))}
        />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root" density={density}>
        <KitEmpty part="text" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" density={density}>
      {items.map((it) => (
        <KitRow
          key={it.id}
          item={it.id}
          label={it.text}
          mark={it.mark}
          density={density}
          leading={<KitCheck done={it.done} part="check" label={it.text} />}
        >
          <KitText role="body" tone={it.done ? "muted" : "text"} part="text" density={density}>
            {it.text}
          </KitText>
          {it.meta && (
            <KitText role="caption" tone="muted" part="meta" density={density}>
              {it.meta}
            </KitText>
          )}
        </KitRow>
      ))}
    </KitCard>
  );
}
