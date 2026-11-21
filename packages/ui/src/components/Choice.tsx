import { z } from "zod";
import {
  probesFor,
  detailOf,
  icon,
  itemsOf,
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
import { KitCard, KitOption, KitSkeleton, KitText, useComponentState, useVariant } from "../kit";

export const meta = {
  id: "Choice",
  group: "input",
  purpose: "Choose among two to five options that each need a sentence to explain.",
  pick: "Choosing among a few options that each carry a short explanation, such as a plan, an answer to a question or a way of doing something. Not one-word filters (Chips), a short value inside a form (Field), switching views of one screen (Segmented), or keep-or-skip one at a time (SwipeStack).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The chosen option is stored on one record in the on-device database.",
  variants: { surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  writeHints: [
    'Leave axes null unless asked. For unboxed rows with radio buttons or checkboxes use surface "plain".',
    'To hide the option explanations, keep them in sub and set detail to "brief"; badges and values stay visible.',
    "Set surface to null unless the person explicitly asks for unboxed rows. A request to hide explanations changes only detail, not surface.",
  ],
  items: { key: "options", parts: ["root", "icon", "title", "badge", "sub", "value"] },
  select: { prop: "at", value: "index" },
  parts: ["root", "question"],
  states: ["filled", "loading"],
  actions: {
    items: { root: ["select", "toggle"] },
    // One option is chosen in a single choice; several can be ticked in a multiple one.
    when: { "root.select": { multi: false }, "root.toggle": { multi: true } },
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    question: text(60).optional(),
    options: z
      .array(
        z.strictObject({
          title: text(28),
          sub: text(80).optional(),
          icon: icon.optional(),
          value: text(16).optional(),
          badge: text(12).optional(),
          on: z.boolean().optional(),
        }),
      )
      .min(2)
      .max(5),
    at: z.int().min(0).optional(),
    multi: z.boolean().default(false),
  })
  .refine(({ at, options }) => at === undefined || at < options.length, {
    path: ["at"],
    message: "Must index an available option",
  })
  .refine(({ multi, at }) => !multi || at === undefined, { path: ["at"], message: "Several choices use on" })
  // In a single choice the chosen option is `at`, or the first option written with `on`; `on` is then
  // derived for every option so each one says whether it is chosen.
  .overwrite((value) => {
    const first = value.options.findIndex((option) => option.on);
    const at = value.multi ? undefined : (value.at ?? (first >= 0 ? first : undefined));
    return {
      ...value,
      options: value.options.map((option, index) => ({
        ...option,
        ...(value.detail === "brief" ? { sub: undefined } : {}),
        on: value.multi ? (option.on ?? false) : index === at,
      })),
    };
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const options = itemsOf(cast, 3).flatMap((item) => {
    const title = titleOf(item, 28, thing);
    const sub = detailOf(item, 80, thing);
    return title ? [{ title, ...(sub ? { sub } : {}) }] : [];
  });
  while (options.length < 2) options.push({ title: placeholderTitle(options.length, lang) });
  return { options };
}

const days = {
  question: "Which days suit you?",
  multi: true,
  options: [
    { title: "Weekdays", sub: "Monday to Friday", on: true },
    { title: "Weekends", sub: "Saturday and Sunday" },
  ],
};
export const examples = [
  {
    question: "How often should it be watered?",
    options: [
      { title: "Every week", sub: "Good for ferns and anything in a bright room.", icon: "drop" },
      { title: "Every two weeks", sub: "Good for succulents and slow growers." },
      { title: "Only when dry", sub: "Check the soil with a finger first." },
    ],
    at: 0,
  },
  {
    surface: "plain",
    question: "Pick a walk plan",
    options: [
      { title: "Single walk", sub: "One 30 minute walk.", value: "£15" },
      { title: "Weekly pack", sub: "Five walks, any weekday.", value: "£65", badge: "Most popular" },
      { title: "Monthly", sub: "Daily walks, cancel any time.", value: "£240" },
    ],
    at: 1,
  },
  days,
  { ...days, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Choice");
export const probes = [
  choose(
    "Let me pick one of three walk packages, each with a line explaining what is included and its price",
  ),
  choose("Let me filter my plants by room using a few short one-word tags", "Chips"),
  write(
    "Ask how often to water the fern, with the answers every week, every two weeks and only when dry, each with a short reason, starting on every week",
  ),
  {
    ...write(
      "Ask which walk plan to book: Single walk or Weekly pack. Store a short explanation for each option. Hide just the explanations without changing any styling.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Choose every two weeks", { address: "c1/r2", action: "select" }),
] satisfies Probe[];

export function Choice({ surface, detail, question, options, multi }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const look = useVariant("surface", meta.variants.surface, surface) === "plain" ? "list" : "cards";
  const shown = detail === "brief" ? options.map((option) => ({ ...option, sub: undefined })) : options;
  if (state === "loading") {
    return (
      <KitCard style="plain" padded inset="none">
        <KitSkeleton shape="options" question={question} look={look} items={shown} />
      </KitCard>
    );
  }
  return (
    <KitCard style="plain" part="root" padded inset="none">
      {question && (
        <KitText role="heading" part="question">
          {question}
        </KitText>
      )}
      {shown.map((option) => (
        <KitOption
          key={option.id}
          item={option.id}
          title={option.title}
          sub={option.sub}
          icon={option.icon}
          value={option.value}
          badge={option.badge}
          on={option.on === true}
          multi={multi}
          look={look}
          reserveIcon={options.some((entry) => entry.icon !== undefined)}
        />
      ))}
    </KitCard>
  );
}
