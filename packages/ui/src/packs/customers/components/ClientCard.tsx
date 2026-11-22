// prettier-ignore
import { useWords, KitAction, KitCard, KitContent, KitGrid, KitHeader, KitLayoutText, KitPhoto, KitState, KitTrail, useComponentState, useVariant } from "../../../kit";
import { customersWordsFor } from "../lang";
import { z } from "zod";
// prettier-ignore
import { detailOf, itemsOf, photo, placeholderTitle, probesFor, isoDate, text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
import { clientBalanceLine, clientReading, sinceLine, nextLine, tagsLine, type contactLabels } from "../copy";
import { prompt } from "../../../entry/prompt-ClientCard.generated";

// Core first: Profile/row cannot show client tenure, next business visit and contact actions together.
export const meta = {
  id: "ClientCard",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
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
  // prettier-ignore
  parts: ["root", "photo", "name", "since", "next", "tags", "call", "message", "directions", "company", "balance", "email"],
  partTiers: { call: "service", message: "service", directions: "service", email: "service" },
  states: ["filled", "loading"],
  emptyActions: [], // Use the displayed state when planning detached actions.
  actions: {
    parts: { call: ["press"], message: ["press"], directions: ["press"], email: ["press"] },
    when: { call: { phone: true }, directions: { address: true }, email: { email: true } },
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
    company: text(28).optional(),
    billing: z.strictObject({ charged: z.number().min(0), paid: z.number().min(0) }).optional(),
    email: z.boolean().optional(),
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
  { ...variantExample, company: "Maple Studio", billing: { charged: 120, paid: 80 }, email: true },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ClientCard");
// prettier-ignore
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
  { ...write("Client Ben Carter at Maple Studio, with a lib:people portrait, no tags, no call or directions buttons. Show his company Maple Studio."),
    expectProps: { company: "Maple Studio" } },
  { ...write("Client Ben Carter, lib:people portrait, no tags or call or directions buttons. Show his account balance from 120 charged and 80 already paid."),
    expectProps: { billing: { charged: 120, paid: 80 } } },
  { ...write("Client Ben Carter, lib:people portrait, no tags or call or directions buttons. Give him an Email button because he has email contact."),
    expectProps: { email: true } },
] satisfies Probe[];

type ClientProps = Props<typeof props, typeof meta>;

function ContactAction({ part }: { part: keyof typeof contactLabels }) {
  const { contactLabels } = useWords(customersWordsFor).words;
  const kind = part === "message" ? "primary" : "secondary";
  return <KitAction part={part} label={contactLabels[part]} kind={kind} full />;
}

// prettier-ignore
function ClientContacts({ phone, address, email, density }: Pick<ClientProps, "phone" | "address" | "email" | "density">) {
  const controls = [
    ...(phone ? [<ContactAction key="call" part="call" />] : []),
    ...(address ? [<ContactAction key="directions" part="directions" />] : []),
    ...(email ? [<ContactAction key="email" part="email" />] : []),
  ];
  return (
    <>
      <ContactAction part="message" />
      {controls.length > 1 ? (
        <KitGrid columns={controls.length === 3 ? 3 : 2} {...{ density }}>
          {controls}
        </KitGrid>
      ) : (
        controls
      )}
    </>
  );
}

// prettier-ignore
export function ClientCard(input: ClientProps) {
  const { name, photo, since, next, tags, phone, address, media, surface, company, billing, email } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  const loading = useComponentState() === "loading";
  const content = (
    <>
      {media !== "none" && <KitPhoto {...{ photo, loading }} shape="avatar" part={loading ? null : "photo"} label={name} />}
      <KitHeader title={{ text: name, part: "name", role: "body", strong: true }} meta={[
        { text: company, part: "company" },
        { text: since && sinceLine(since, lang), part: "since" },
      ]} align="center" {...{ density }} />
      {billing && <KitContent align="center" {...{ density }}>
        <KitTrail kind="badge" part="balance" value={clientBalanceLine(billing, lang)} tone="text" {...{ density }} />
      </KitContent>}
      {next && <KitLayoutText line={{ text: nextLine(next, lang), part: "next", role: "meta", tone: "muted" }} align="center" {...{ density }} />}
      {tags.length > 0 && <KitLayoutText line={{ text: tagsLine(tags), part: "tags", role: "meta", tone: "muted" }} align="center" {...{ density }} />}
      <ClientContacts {...{ phone, address, email, density }} />
    </>
  );
  return (
    <KitCard padded part="root" {...{ density, surface }}>
      <KitState loading={content} {...{ density }}>
        {content}
      </KitState>
    </KitCard>
  );
}
