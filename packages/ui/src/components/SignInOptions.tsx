import { z } from "zod";
import {
  probesFor,
  screenId,
  text,
  variantProps,
  wordsFor,
  type FallbackInput,
  type IconName,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitCard, KitRowGroup, KitText, PartScope, usePartContext, useWords } from "../kit";
import { prompt } from "../entry/prompt-SignInOptions.generated";

const providers = ["apple", "google", "email", "phone"] as const;
type Provider = (typeof providers)[number];
const marks: Record<Provider, IconName> = { apple: "apple", google: "globe", email: "mail", phone: "phone" };

export const meta = {
  id: "SignInOptions",
  status: "draft",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "Connect each sign-in method to the app's authentication provider.",
  variants: { emphasis: ["normal", "quiet"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["divider"] } },
  parts: ["root", "divider"],
  items: { key: "items", parts: ["root", "label"] },
  states: ["filled"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled"
      ? (input as z.output<typeof props>).items.map(({ provider }) => wordsFor(lang).signInOptions[provider])
      : [],
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    divider: text(12).optional(),
    items: z
      .array(z.strictObject({ provider: z.enum(providers), goto: screenId }))
      .min(1)
      .max(4),
  })
  .refine(({ items }) => new Set(items.map(({ provider }) => provider)).size === items.length, {
    path: ["items"],
    message: "Each sign-in provider must be distinct",
  })
  .overwrite((input) => ({ ...input, ...(input.detail === "brief" ? { divider: undefined } : {}) }));

export function fallback(_input: FallbackInput): z.input<typeof props> {
  return { items: [{ provider: "email", goto: "signin" }] };
}

const ledge = {
  divider: "or",
  items: [
    { provider: "apple", goto: "apple_signin" },
    { provider: "google", goto: "google_signin" },
    { provider: "email", goto: "email_signin" },
  ],
} satisfies z.input<typeof props>;
export const examples = [
  ledge,
  { items: [{ provider: "phone", goto: "walker_phone" }], emphasis: "quiet" },
  { ...ledge, detail: "brief" },
  ledge,
  ledge,
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("SignInOptions");
export const probes = [
  choose("Let members log in with their Apple account, Google account or email address"),
  choose("Give me three shortcut tiles to my plants, watering history and schedule", "Actions"),
  {
    ...write(
      'Offer Apple and email for login. Apple opens apple_signin, email opens email_signin, and the divider says "or".',
    ),
    fields: {
      "items.0.provider": "apple",
      "items.0.goto": "apple_signin",
      "items.1.provider": "email",
      "items.1.goto": "email_signin",
      divider: "or",
    },
  },
  {
    ...write(
      'Offer email sign-in linked to email_signin. Keep the divider wording "or" in the data, but hide it on screen.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Continue with Google", { address: "s1/r2", action: "press" }),
] satisfies Probe[];

export function SignInOptions({ divider, items, emphasis }: Props<typeof props, typeof meta>) {
  const scope = usePartContext();
  const { signInOptions } = useWords().words;
  return (
    <KitCard part="root" style="plain" padded inset="none">
      {divider && (
        <KitText part="divider" role="caption" align="center" tone="muted">
          {divider}
        </KitText>
      )}
      <KitRowGroup separators={false} spacing="groups">
        {items.map(({ id, provider, goto }) => (
          <PartScope key={id} {...scope} item={id}>
            <KitAction
              part="root"
              full
              kind={emphasis === "quiet" ? "quiet" : "secondary"}
              tone="neutral"
              icon={marks[provider]}
              label={signInOptions[provider]}
              contentParts={{ label: "label" }}
              goto={goto}
            />
          </PartScope>
        ))}
      </KitRowGroup>
    </KitCard>
  );
}
