import { wordsFor } from "../catalog";
import { z } from "zod";
import {
  probesFor,
  icon,
  screenId,
  text,
  variantProps,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, useVariant } from "../kit";
import { prompt } from "../entry/prompt-Button.generated";

export const meta = {
  id: "Button",
  group: "action",
  ...prompt,
  region: "bottom",
  weight: 1,
  tier: "phone",
  realPath: "A press runs an on-device action or opens the linked screen.",
  variants: {
    surface: ["card", "tinted", "plain"],
    media: ["icon", "none"],
  },
  variantParts: { "media.none": { hides: ["root_icon"] } },
  parts: ["root", "root_icon"],
  states: ["filled"],
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
  { label: "Log watering", icon: "drop", media: "none" },
  { label: "Remove plant", kind: "danger", confirm: "Remove this plant and its history?" },
  { label: "Log watering", icon: "drop", surface: "tinted" },
  { label: "Log watering", icon: "drop", surface: "plain" },
  { label: "Book a walk", goto: "book_walk" },
  { label: "Back to walks", goto: "back" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Button");
export const probes = [
  choose("Let me log watering with one main tap"),
  choose("Give me three shortcuts to log watering, add a plant and see the schedule", "Actions"),
  write("Let me book a dog walk and open the booking screen"),
  write("A Remove plant button that, before it does anything, asks Remove this plant and its history?"),
  {
    ...write("Keep the normal filled Log watering button. Store its water drop icon but hide the icon."),
    variant: { axis: "media", value: "none" },
  },
  read("Press the main button", { address: "b1/root", action: "press" }),
] satisfies Probe[];

const actionLook = { card: "primary", tinted: "secondary", plain: "quiet" } as const;

export function Button({ label, surface, kind, media, icon, goto }: Props<typeof props, typeof meta>) {
  const look = useVariant("surface", meta.variants.surface, surface);
  const action = kind ?? actionLook[look];
  return (
    <KitAction
      label={label}
      icon={media === "none" ? undefined : icon}
      kind={action}
      goto={goto}
      part="root"
      full={action === "primary" || action === "danger"}
    />
  );
}
