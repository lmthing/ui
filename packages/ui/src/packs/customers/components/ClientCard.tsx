// prettier-ignore
import { useWords, KitAction, KitCard, KitContent, KitGrid, KitPhoto, KitSkeleton, KitText, type TextRole, useComponentState, useVariant } from "../../../kit";
import { customersWordsFor } from "../lang";
import { z } from "zod";
// prettier-ignore
import { detailOf, itemsOf, photo, placeholderTitle, probesFor, isoDate, text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
import { clientReading, sinceLine, nextLine, tagsLine, type contactLabels } from "../copy";

// Core first: Profile/row cannot show client tenure, next business visit and contact actions together.
export const meta = {
  id: "ClientCard",
  status: "ready",
  group: "content",
  purpose: "Recognise one business client, their next visit and how to contact them.",
  pick: "One business client's page head with tenure, next booking or order, tags and contact actions. Not another kind of identity (Profile), multiple clients as tappable rows (List), or plain labelled phone and address details without contact buttons (KeyValue). All clients with a photo and last-visit detail on each row remain List, never this one-client page head.",
  writeHints: [
    'Use null for unrequested axes. A photo is required unless media is "none"; use "none" only when asked not to show the photo.',
    'If asked only to hide tenure, next booking and tags, use {"density":null,"surface":null,"media":null,"detail":"brief"} and keep those details in the data.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A client record on the device; calling and messaging use the phone's own apps.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    media: ["thumb", "none"],
    detail: ["full", "brief"],
  },
  variantParts: {
    "media.none": { hides: ["photo"] },
    "detail.brief": { hides: ["since", "next", "tags"] },
  },
  parts: ["root", "photo", "name", "since", "next", "tags", "call", "message", "directions"],
  partTiers: { call: "service", message: "service", directions: "service" },
  states: ["filled", "loading"],
  actions: {
    parts: { call: ["press"], message: ["press"], directions: ["press"] },
    when: { call: { phone: true }, directions: { address: true } },
  },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? clientReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    name: text(28),
    photo: photo.optional(),
    since: isoDate.optional(),
    next: text(36).optional(),
    tags: z.array(text(12)).min(0).max(3),
    phone: z.boolean(),
    address: z.boolean(),
  })
  .refine(({ media, photo }) => media === "none" || photo !== undefined, { path: ["photo"] })
  .overwrite((value) => ({
    ...value,
    ...(value.media === "none" ? { photo: undefined } : {}),
    ...(value.detail === "brief" ? { since: undefined, next: undefined, tags: [] } : {}),
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    name: (item && titleOf(item, 28, thing)) || placeholderTitle(0, lang),
    photo: "local:1",
    next: (item && detailOf(item, 36, thing)) || undefined,
    tags: [],
    phone: false,
    address: false,
  };
}
const variantExample = {
  name: "Mia Jones",
  photo: "lib:people",
  since: "2026-02-15",
  next: "Maple · Thursday 12:00",
  tags: ["Regular"],
  phone: true,
  address: true,
} satisfies z.input<typeof props>;
export const examples = [
  {
    name: "Anna Patel",
    photo: "lib:people",
    since: "2025-04-03",
    next: "Plant care · Friday 09:00",
    tags: ["Regular", "Key holder"],
    phone: true,
    address: true,
  },
  {
    name: "Ben Carter",
    photo: "lib:people",
    next: "Clover and Pip · Monday 10:00",
    tags: ["New"],
    phone: false,
    address: false,
  },
  { ...variantExample, density: "compact" },
  { ...variantExample, surface: "outlined" },
  { ...variantExample, media: "none" },
  { ...variantExample, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ClientCard");
export const probes = [
  choose("At the top of a client's page, show their photo, when they joined, next visit and contact buttons"),
  choose("Show my own identity with a photo, name, short bio and an edit button", "Profile"),
  write(
    "Client Ben Carter, photo lib:people, joined 2025-04-03, next park walk Monday 10:00, tag Regular, allow calls and directions",
  ),
  {
    ...write(
      "Show Ben Carter's name, his lib:people portrait and contact buttons. Keep his 2025-04-03 join date, Monday 10:00 park walk and Regular tag on file without displaying those three details.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Call Anna", { address: "c1/call", action: "press" }),
] satisfies Probe[];

type ClientProps = Props<typeof props, typeof meta>;
function ClientText({
  value,
  part,
  role = "label",
  density,
}: {
  value: string;
  part: string;
  role?: TextRole;
  density: NonNullable<ClientProps["density"]>;
}) {
  if (useComponentState() === "loading")
    return <KitSkeleton shape="figure" inset="none" centered content={[[role, value]]} {...{ density }} />;
  return (
    <KitText
      role={role}
      tone={part === "name" ? "text" : "muted"}
      align="center"
      part={part}
      {...{ density }}
    >
      {value}
    </KitText>
  );
}

function ContactAction({ part }: { part: keyof typeof contactLabels }) {
  const { contactLabels } = useWords(customersWordsFor).words;
  const kind = part === "message" ? "primary" : "secondary";
  if (useComponentState() === "loading")
    return <KitSkeleton shape="control" kind={kind} label={contactLabels[part]} full />;
  return <KitAction part={part} label={contactLabels[part]} kind={kind} full />;
}

export function ClientCard(input: ClientProps) {
  const { name, photo, since, next, tags, phone, address, media, surface } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  const loading = useComponentState() === "loading";
  const portrait = loading ? (
    <KitSkeleton shape="media" aspect="avatar" inset="none" lines={[]} />
  ) : (
    <KitPhoto {...(photo ? { photo } : {})} shape="avatar" part="photo" label={name} />
  );
  return (
    <KitCard padded part="root" {...{ density, surface }}>
      {media !== "none" && portrait}
      <KitContent {...{ density }}>
        <ClientText value={name} role="heading" part="name" {...{ density }} />
        {since && <ClientText value={sinceLine(since, lang)} role="label" part="since" {...{ density }} />}
      </KitContent>
      {next && <ClientText value={nextLine(next, lang)} part="next" {...{ density }} />}
      {tags.length > 0 && <ClientText value={tagsLine(tags)} role="label" part="tags" {...{ density }} />}
      <ContactAction part="message" />
      {phone && address ? (
        <KitGrid columns={2} {...{ density }}>
          <ContactAction part="call" />
          <ContactAction part="directions" />
        </KitGrid>
      ) : phone ? (
        <ContactAction part="call" />
      ) : address ? (
        <ContactAction part="directions" />
      ) : null}
    </KitCard>
  );
}
