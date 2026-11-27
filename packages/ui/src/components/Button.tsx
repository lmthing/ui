import { wordsFor } from "../catalog";
import { z } from "zod";
import {
  probesFor,
  icon,
  screenId,
  text,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import {
  KitAction,
  KitCard,
  KitIcon,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useVariant,
} from "../kit";
import { prompt } from "../entry/prompt-Button.generated";

export const meta = {
  id: "Button",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "bottom",
  weight: 1,
  tier: "phone",
  realPath: "A press runs an on-device action or opens the linked screen.",
  variants: {
    emphasis: ["normal", "quiet"],
    media: ["icon", "none"],
  },
  variantParts: { "media.none": { hides: ["root_icon"] } },
  writeHints: prompt.writeHints,
  parts: ["root", "root_icon"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] } },
  // Pressing asks first when a confirm sentence is written (a sheet the host draws).
  read: (input, _state, lang?: string) => {
    const { confirmNote } = wordsFor(lang);
    return (input as { confirm?: string }).confirm ? [confirmNote] : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  label: text(24),
  // The screen rule requires confirmation copy for this kind.
  kind: z.literal("danger").optional(),
  icon: icon.optional(),
  goto: screenId.optional(),
  // The sentence a standard confirm sheet shows before the press runs. Not drawn on the button itself.
  confirm: z.string().trim().min(1).max(60).optional(),
});

export function fallback({ lang }: { cast: CastLike; lang?: string | undefined }): z.input<typeof props> {
  return { label: wordsFor(lang).placeholderLabel };
}

export const examples = [
  { label: "Log watering", icon: "drop" },
  { label: "Book a walk", goto: "book_walk" },
  { label: "Log watering", icon: "drop", media: "none" },
  { label: "Remove plant", kind: "danger", confirm: "Remove this plant and its history?" },
  { label: "Log watering", icon: "drop" },
  { label: "Log watering", icon: "drop" },
  { label: "View schedule", icon: "calendar", emphasis: "quiet", goto: "schedule" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Button");
export const probes = [
  choose("Let me log watering with one main tap"),
  choose("Give me three shortcuts to log watering, add a plant and see the schedule", "Actions"),
  write("Let me book a dog walk and open the booking screen"),
  {
    ...write(
      'Give me one main action to open my saved tracks on the "saved_tracks" screen. Call it "View saved tracks".',
    ),
    expectProps: { label: "View saved tracks", goto: "saved_tracks" },
  },
  write("A Remove plant button that, before it does anything, asks Remove this plant and its history?"),
  {
    ...write("Keep the normal filled Log watering button. Store its water drop icon but hide the icon."),
    variant: { axis: "media", value: "none" },
  },
  {
    ...write(
      'Below the plant details, add a low-key secondary button labelled "Care notes" that opens the "care_notes" screen. Use the text label alone; there is no icon to show or hide.',
    ),
    variant: { axis: "emphasis", value: "quiet" },
    expectProps: { label: "Care notes", goto: "care_notes" },
  },
  read("Press the main button", { address: "b1/root", action: "press" }),
] satisfies Probe[];

export function Button({ label, kind, emphasis, media, icon, goto }: Props<typeof props, typeof meta>) {
  const finish = useVariant("emphasis", meta.variants.emphasis, emphasis);
  const loading = useComponentState() === "loading";
  const glyph = media === "none" ? undefined : icon;
  const action = kind ?? (finish === "quiet" ? "quiet" : "primary");
  if (loading)
    return (
      <KitCard style="plain" part="root">
        <KitSkeleton shape="control" kind={action} label={label} full={finish !== "quiet" || !!goto} />
      </KitCard>
    );
  if (action === "quiet" && goto)
    return (
      <KitRow
        part="root"
        label={label}
        goto={goto}
        lineRole="label"
        leadingAlign="row"
        leading={glyph && <KitIcon name={glyph} tone="accent" part="root_icon" />}
        trailing={<KitIcon name="chevron_right" decorative />}
      >
        <KitText role="label" tone="accent" part="root_label" breakLongWords>
          {label}
        </KitText>
      </KitRow>
    );
  return (
    <KitAction label={label} icon={glyph} kind={action} goto={goto} part="root" full={finish !== "quiet"} />
  );
}
