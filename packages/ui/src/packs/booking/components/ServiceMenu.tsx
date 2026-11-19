import {
  useWords,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitText,
  type TextRole,
  type TextTone,
  useComponentState,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { servicePrice, serviceReading } from "../copy";
import { z } from "zod";
import {
  detailOf,
  durationLine,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: List/inset cannot group twelve services with numeric duration and price.
export const meta = {
  id: "ServiceMenu",
  status: "ready",
  group: "content",
  purpose: "Choose a bookable service by duration and price, grouped by offering.",
  pick: "Services to book with numeric duration, price and optional group headings. Not plain things to browse (List), an existing booking (Appointment), or goods for sale (ProductGrid). Several ordinary things each with short details and their own link remain List.",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Services stored on the device by the provider.",
  items: { key: "services", parts: ["root", "name", "minutes", "price", "sub", "group", "photo"] },
  parts: ["root", "empty"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang?: string) =>
    state === "filled" ? serviceReading((input as z.output<typeof props>).services, lang) : [],
} as const satisfies Meta;
export const props = z.strictObject({
  services: z
    .array(
      z.strictObject({
        name: text(28),
        minutes: z.int().min(5).max(600),
        price: z.number().min(0).optional(),
        sub: text(60).optional(),
        group: text(20).optional(),
        photo: photo.optional(),
        goto: screenId,
      }),
    )
    .min(1)
    .max(12),
  style: z.enum(["rows", "cards"]).default("rows"),
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const services = itemsOf(cast, 3).map((item) => ({
    name: titleOf(item, 28, thing) || placeholderTitle(0, lang),
    sub: detailOf(item, 60, thing) || undefined,
    minutes: 30,
    goto: "details",
  }));
  return {
    services: services.length
      ? services
      : [{ name: placeholderTitle(0, lang), minutes: 30, goto: "details" }],
  };
}
export const examples = [
  {
    style: "rows",
    services: [
      {
        name: "Plant care visit",
        minutes: 30,
        price: 20,
        group: "Care",
        sub: "Watering and leaf care",
        goto: "time",
      },
      { name: "Repotting visit", minutes: 60, price: 40, group: "Care", goto: "time" },
    ],
  },
  {
    style: "cards",
    services: [
      {
        name: "Morning park walk",
        minutes: 30,
        price: 15,
        sub: "Clover and Pip",
        photo: "lib:dogs",
        goto: "time",
      },
      { name: "Long walk", minutes: 60, price: 25, photo: "lib:dogs", goto: "time" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ServiceMenu");
export const probes = [
  choose("Let clients book one of my services, grouped by type, with minutes and a price for each"),
  choose("Show several plants with short details and a link to open each", "List"),
  write("Offer a 30 minute park walk for 15 and a 60 minute walk for 25, both opening time"),
  read("Book the plant care visit", { address: "s1/r1", action: "press" }),
] satisfies Probe[];

function ServiceText({
  value,
  part,
  role = "body",
  tone = "text",
}: {
  value: string;
  part: string | null;
  role?: TextRole;
  tone?: TextTone;
}) {
  const loading = useComponentState() === "loading";
  const skeleton = (
    <KitSkeleton shape="figure" inset="none" content={[[role === "number" ? "body" : role, value]]} />
  );
  if (loading) return role === "number" ? <KitContent lead={skeleton}>{null}</KitContent> : skeleton;
  return (
    <KitText role={role} tone={tone} numberScale="compact" tabular={role === "number"} part={part}>
      {value}
    </KitText>
  );
}

function ServiceRows({ services }: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { bookLabel } = bookingWordsFor(lang);
  const loading = useComponentState() === "loading";
  const photos = services.some((service) => service.photo);
  return (
    <>
      {services.map((service, index) => (
        <KitRow
          key={service.id}
          item={service.id}
          label={loading ? words.loadingLabel : service.name}
          goto={loading ? undefined : service.goto}
          leadingAlign="row"
          leadingWidth={photos ? "avatar" : undefined}
          leading={service.photo && <KitPhoto photo={service.photo} label={service.name} part="photo" />}
        >
          <KitGrid columns={2} fitLast>
            <KitContent>
              {service.group && service.group !== services[index - 1]?.group && (
                <ServiceText value={service.group} role="caption" tone="muted" part="group" />
              )}
              <ServiceText value={service.name} part="name" />
              <ServiceText
                value={durationLine(service.minutes, lang)}
                role="number"
                tone="muted"
                part="minutes"
              />
              {service.sub && <ServiceText value={service.sub} role="caption" tone="muted" part="sub" />}
            </KitContent>
            <KitContent>
              <ServiceText value={bookLabel} role="label" tone="accent" part={null} />
              {service.price !== undefined && (
                <ServiceText value={servicePrice(service.price, lang)} role="number" part="price" />
              )}
            </KitContent>
          </KitGrid>
        </KitRow>
      ))}
    </>
  );
}

export function ServiceMenu(input: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { style } = input;
  return (
    <KitCard style={state === "empty" || style === "rows" ? "inset" : "cards"}>
      {state === "empty" ? <KitEmpty decorativeIcon part="empty" /> : <ServiceRows {...input} />}
    </KitCard>
  );
}
