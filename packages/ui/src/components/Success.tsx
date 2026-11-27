import { useWords, KitAction, KitCard, KitContent, KitEmpty, KitIcon, KitRow, KitText } from "../kit";
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
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The result of an action that saved or changed an item in the on-device database.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "icon", "title", "sub", "owner", "next", "subject", "when", "receipt", "undo", "close"],
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
    outcome: z.enum(["pending", "confirmed", "done"]).optional(),
    owner: text(32).optional(),
    next: text(80).optional(),
    subject: text(48).optional(),
    when: text(40).optional(),
    receipt: text(48).optional(),
  })
  .refine(validOutcome, {
    path: ["outcome"],
    message: "Give pending an owner and next step, confirmed a subject and time, or done a receipt",
  })
  // Taking an action back only makes sense in a toast, so `undo` makes it one. `undoable` is derived,
  // never written.
  .overwrite((value) => ({
    ...value,
    style: value.undo ? "toast" : value.style,
    sub: value.detail === "brief" ? undefined : value.sub,
    undoable: value.undo,
  }));

function validOutcome(input: {
  outcome?: "pending" | "confirmed" | "done" | undefined;
  owner?: string | undefined;
  next?: string | undefined;
  subject?: string | undefined;
  when?: string | undefined;
  receipt?: string | undefined;
  undo: boolean;
  style: "screen" | "toast";
}) {
  const { outcome, owner, next, subject, when, receipt } = input;
  if (!outcome) return !owner && !next && !subject && !when && !receipt;
  if (input.undo || input.style === "toast") return false;
  if (outcome === "pending") return Boolean(owner && next && !when && !receipt);
  if (outcome === "confirmed") return Boolean(subject && when && !owner && !next && !receipt);
  return Boolean(receipt && !owner && !next && !when);
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail, saved } = wordsFor(lang);

  const item = cast.items[0];
  const sub = item ? titleOf(item, 100, thingOf(cast, item.type)) : undefined;
  return { title: saved, sub: sub ?? placeholderDetail };
}

const booked = { title: "Walk booked", sub: "Clover, tomorrow at 09:00" };
export const examples = [
  { title: "Fern watered", sub: "Bathroom, just now. No action needed.", icon: "circle_check" },
  booked,
  { style: "toast", title: "Walk cancelled", sub: "Clover, tomorrow at 09:00", icon: "calendar", undo: true },
  { ...booked, title: "Clover’s walk booked · tomorrow at 09:00", detail: "brief" },
  {
    title: "Repotting request received",
    outcome: "pending",
    subject: "Bird's nest fern",
    owner: "Glasshouse team",
    next: "Wait for the team to confirm a date.",
  },
  {
    title: "Walk confirmed",
    outcome: "confirmed",
    subject: "Clover · 45-minute walk",
    when: "Friday at 09:00",
    sub: "Meet at the Meadow gate.",
  },
  {
    title: "Care notes saved",
    outcome: "done",
    subject: "Bird's nest fern",
    receipt: "Record FN-104",
    sub: "No action needed.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Success");
export const probes = [
  choose(
    "Right after I book a dog walk, show a one-time confirmation that it worked and when it is, not the appointment record.",
  ),
  choose("Make an urgent warning stand out at the top because today's dog walk has been cancelled", "Banner"),
  choose(
    "After I submit a request on this phone, show a one-time confirmation of my own submission. It is still waiting for a decision; name the next owner and step, without tracking a transfer to another role or their acknowledgement.",
  ),
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
  {
    ...write(
      "The repotting request is still waiting. Say Repotting request received, show Glasshouse team as the next owner and say they will confirm a date.",
    ),
    expectProps: { outcome: "pending", owner: "Glasshouse team" },
  },
] satisfies Probe[];

type SuccessProps = Props<typeof props, typeof meta>;
function SuccessToast({ title, sub, icon, undo }: SuccessProps) {
  const { messageLabels } = useWords().words;
  return (
    <KitCard
      style="inset"
      look={undo ? "surface" : "tinted"}
      tone={undo ? "neutral" : "good"}
      part="root"
      padded
    >
      <KitRow
        label={title}
        inline
        lineRole="label"
        leading={<KitIcon name={icon} tone={undo ? "muted" : "good"} scale="sm" part="icon" />}
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
  if (input.outcome) return <OutcomeReceipt {...input} />;
  return (
    <KitCard style="plain" part="root">
      <KitEmpty title={title} {...(sub ? { sub } : {})} icon={icon} fill tone="good" />
    </KitCard>
  );
}

function OutcomeReceipt({ title, sub, outcome, subject, owner, next, when, receipt, icon }: SuccessProps) {
  const pending = outcome === "pending";
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent
        lead={<KitIcon part="icon" name={pending ? "clock" : icon} tone={pending ? "warn" : "good"} />}
      >
        <KitText role="heading" part="title">
          {title}
        </KitText>
        {subject && <KitText part="subject">{subject}</KitText>}
        {owner && (
          <KitText part="owner" tone="muted">
            {owner}
          </KitText>
        )}
        {when && (
          <KitText part="when" tone="muted">
            {when}
          </KitText>
        )}
        {receipt && (
          <KitText part="receipt" tone="muted">
            {receipt}
          </KitText>
        )}
        {next && <KitText part="next">{next}</KitText>}
        {sub && (
          <KitText part="sub" tone="muted">
            {sub}
          </KitText>
        )}
      </KitContent>
    </KitCard>
  );
}
