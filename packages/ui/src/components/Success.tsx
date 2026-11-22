import { useWords, KitAction, KitCard, KitEmpty, KitIcon, KitRow, KitText } from "../kit";
import {
  wordsFor,
  probesFor,
  icon,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import { prompt } from "../entry/prompt-Success.generated";

export const meta = {
  id: "Success",
  group: "action",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The result of an action that saved or changed an item in the on-device database.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "icon", "title", "sub", "undo", "close"],
  states: ["filled"],
  // A toast can be swept away and may offer to take the action back.
  actions: {
    parts: { close: ["dismiss"], undo: ["press"] },
    when: { close: { style: "toast" }, undo: { undoable: true } },
  },
  read: (input, _state, lang?: string) => {
    const { messageLabels } = wordsFor(lang);
    return (input as { undo: boolean }).undo ? [messageLabels.undo] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["screen", "toast"]).default("screen"),
    title: text(40),
    sub: text(100).optional(),
    icon: icon.default("circle_check"),
    undo: z.boolean().default(false),
  })
  // Taking an action back only makes sense in a toast, so `undo` makes it one. `undoable` is derived,
  // never written.
  .overwrite((value) => ({
    ...value,
    style: value.undo ? "toast" : value.style,
    sub: value.detail === "brief" ? undefined : value.sub,
    undoable: value.undo,
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail, saved } = wordsFor(lang);

  const item = cast.items[0];
  const sub = item ? titleOf(item, 100, thingOf(cast, item.type)) : undefined;
  return { title: saved, sub: sub ?? placeholderDetail };
}

const booked = { title: "Walk booked", sub: "Clover, tomorrow at 09:00" };
export const examples = [
  { title: "Fern watered", sub: "Bathroom, just now", icon: "circle_check" },
  booked,
  { style: "toast", title: "Walk cancelled", icon: "circle_check", undo: true },
  { ...booked, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Success");
export const probes = [
  choose("After I book a dog walk, show a dedicated screen saying it worked and when the walk is"),
  choose("Make an urgent warning stand out at the top because today's dog walk has been cancelled", "Banner"),
  write(
    "I just booked a walk for Clover tomorrow at 09:00. Show that the booking worked, with a check symbol and the dog and time underneath.",
  ),
  write("A small message at the bottom saying Walk cancelled, with a way to undo it"),
  {
    ...write(
      'Confirm the walk was booked. Keep "Clover, tomorrow at 09:00" as the subtitle in the data, but show the confirmation title without the subtitle.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Undo the cancellation", { address: "s1/undo", action: "press" }, 2),
] satisfies Probe[];

type SuccessProps = Props<typeof props, typeof meta>;
function SuccessToast({ title, sub, icon, undo }: SuccessProps) {
  const { messageLabels } = useWords().words;
  return (
    <KitCard style="inset" look="tinted" tone="good" part="root" padded>
      <KitRow
        label={title}
        inline
        lineRole="label"
        leading={<KitIcon name={icon} tone="good" scale="sm" part="icon" />}
        trailing={[
          undo && <KitAction key="undo" label={messageLabels.undo} kind="quiet" part="undo" />,
          <KitAction key="close" icon="close" a11y={messageLabels.dismiss} kind="quiet" part="close" />,
        ]}
      >
        <KitText role="label" part="title">
          {title}
        </KitText>
        {sub && (
          <KitText role="caption" tone="muted" part="sub">
            {sub}
          </KitText>
        )}
      </KitRow>
    </KitCard>
  );
}

export function Success(input: SuccessProps) {
  if (input.style === "toast") return <SuccessToast {...input} />;
  const { title, sub, icon } = input;
  return (
    <KitCard style="plain" part="root">
      <KitEmpty title={title} {...(sub ? { sub } : {})} icon={icon} fill tone="good" />
    </KitCard>
  );
}
