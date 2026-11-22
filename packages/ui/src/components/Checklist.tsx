import { z } from "zod";
import {
  probesFor,
  itemsOf,
  itemVariantProps,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { KitCard, KitCheck, KitRow, KitSkeleton, KitText, useComponentState, KitEmpty, useKit } from "../kit";
import { prompt } from "../entry/prompt-Checklist.generated";

export const meta = {
  id: "Checklist",
  signature: "check_burst",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Task completion flags stored in the on-device database.",
  variants: { detail: ["full", "brief"] },
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

const plantJobs = [
  { text: "Water the bathroom fern", done: false, meta: "Today · Ledge" },
  { text: "Mist the monstera", done: true, meta: "Living room" },
  { text: "Turn the kitchen basil", done: false },
];

export const examples = [
  { items: plantJobs },
  {
    items: [
      { text: "Clip Clover's lead", done: true },
      { text: "Pack water and a bowl", done: false, meta: "Before the morning walk" },
      { text: "Bring spare waste bags", done: false },
    ],
  },
  { items: plantJobs },
  { detail: "brief", items: plantJobs },
  { items: [{ ...plantJobs[0]!, mark: "highlight" }, ...plantJobs.slice(1)] },
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
  const density = useKit().density;
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
