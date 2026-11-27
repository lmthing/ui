import { useWords, KitAction, KitCard, KitEmpty } from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  emptyLine,
  icon,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import { prompt } from "../entry/prompt-Empty.generated";

export const meta = {
  id: "Empty",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The absence of results from a query over one thing in the on-device database.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "icon", "title", "sub", "retry"],
  states: ["filled"],
  // Only a message about something that failed offers another try.
  actions: { parts: { retry: ["press"] }, when: { retry: { retryable: true } } },
  read: (input, _state, lang?: string) => {
    const { messageLabels } = wordsFor(lang);
    return (input as { retryable?: boolean }).retryable ? [messageLabels.retry] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    title: text(40),
    sub: text(100).optional(),
    icon: icon.optional(),
    kind: z.enum(["none", "filtered", "complete", "error", "offline"]).default("none"),
  })
  // Derived, never written: a failed or offline message offers a retry.
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { sub: undefined } : {}),
    retryable: value.kind === "error" || value.kind === "offline",
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return {
    title: clip(emptyLine(thingOf(cast)?.type, lang), 40),
    sub: placeholderDetail,
  };
}

export const examples = [
  { title: "No plants yet", icon: "leaf", sub: "Added plants will appear here." },
  { title: "No walks today", sub: "Booked walks will appear here." },
  { title: "Couldn't load your walks", sub: "Check your connection.", kind: "error" },
  {
    title: "Couldn’t load walks offline",
    sub: "Reconnect, then try loading your walks again.",
    kind: "offline",
  },
  { title: "No walks today", sub: "Booked walks will appear here.", detail: "brief" },
  {
    title: "No walks in this filter",
    sub: "Try showing all routes instead of just the riverside route.",
    kind: "filtered",
  },
  { title: "All plant care done", sub: "The next scheduled check is on Friday.", kind: "complete" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Empty");
export const probes = [
  choose("My plant collection has nothing in it yet; show a calm message saying there are no plants"),
  choose(
    "Make 2 the single large main number on my plant screen, with plants need water today underneath",
    "Hero",
  ),
  choose(
    "Nothing matches the active Riverside filter. Replace the absent results with a short message explaining why nothing is showing.",
  ),
  write("My walks could not be loaded. Show a calm message that says what went wrong."),
  write(
    "My plant collection has no plants yet. Say so with a leaf symbol and explain that added plants will appear here.",
  ),
  {
    ...write(
      "Say No walks booked. Save the explanation New bookings will appear here, but show only the main line for now.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write(
      "No walks match the Riverside filter. Explain that I can switch to all routes, without suggesting that anything failed.",
    ),
    expectProps: { kind: "filtered" },
  },
  read("Try loading my walks again", { address: "e1/retry", action: "press" }, 2),
] satisfies Probe[];

const kindIcon = {
  none: undefined,
  filtered: "filter",
  complete: "circle_check",
  error: "alert",
  offline: "wifi",
} as const;

function RetryAction(props: { kind: "secondary"; part: "retry"; full: true }) {
  const { messageLabels } = useWords().words;
  return <KitAction {...props} label={messageLabels.retry} />;
}

export function Empty({ title, sub, icon, kind }: Props<typeof props, typeof meta>) {
  const shown = icon ?? kindIcon[kind];
  const retry = kind === "error" || kind === "offline";
  return (
    <KitCard style="plain" part="root">
      <KitEmpty
        title={title}
        {...(sub ? { sub } : {})}
        {...(shown ? { icon: shown } : {})}
        fill={!retry}
        tone={kind === "complete" ? "good" : "neutral"}
      />
      {retry && <RetryAction kind="secondary" part="retry" full />}
    </KitCard>
  );
}
