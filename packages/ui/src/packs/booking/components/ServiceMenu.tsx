// prettier-ignore
import {
  KitCard, KitContent, KitEmpty, KitPhoto, KitRow, KitSkeleton, KitText,
  PartContext, type TextRole, type TextTone, useComponentState, usePartContext, useVariant, useWords,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { servicePrice, serviceReading } from "../copy";
import { z } from "zod";
// prettier-ignore
import {
  detailOf, durationLine, itemsOf, itemVariantProps, photo, placeholderTitle, probesFor,
  screenId, text, thingOf, titleOf, variantProps, type ThemeDensity, type FallbackInput,
  type Meta, type Probe, type Props,
} from "../../../catalog";
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
  writeHints: [
    'A request to hide descriptions changes ONLY detail to "brief". Keep the supplied description in sub. Set density, surface, lead, style and every row tone/mark to null unless separately asked; do not spell out defaults. An absent photo does not request lead "none".',
  ],
  // prettier-ignore
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"],
    detail: ["full", "brief"], lead: ["thumb", "none"] },
  items: {
    key: "services",
    parts: ["root", "name", "minutes", "price", "sub", "group", "photo"],
    variants: { tone: ["neutral", "good"], mark: ["none", "muted"] },
  },
  variantParts: { "detail.brief": { hides: ["sub"] }, "lead.none": { hides: ["photo"] } },
  parts: ["root", "empty"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? serviceReading((input as z.output<typeof props>).services, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    services: z
      .array(
        z.strictObject({
          ...itemVariantProps(meta.items.variants),
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
    style: z.literal("cards").optional(),
  })
  .overwrite((value) => ({
    ...value,
    services: value.services.map((service) => ({
      ...service,
      ...(value.detail === "brief" ? { sub: undefined } : {}),
      ...(value.lead === "none" ? { photo: undefined } : {}),
    })),
  }));
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
// prettier-ignore
const walkingServices = [
  { name: "Park walk", minutes: 30, price: 15, sub: "Clover and Pip", photo: "lib:dogs", goto: "time" },
  { name: "Home visit", minutes: 30, photo: "lib:walk", goto: "time" },
];
// prettier-ignore
export const examples = [
  {
    services: [
      { name: "Plant care visit", minutes: 30, price: 20, group: "Care", sub: "Watering and leaf care", goto: "time" },
      { name: "Repotting visit", minutes: 60, price: 40, group: "Care", goto: "time" },
    ],
  },
  {
    style: "cards",
    services: [
      { name: "Morning park walk", minutes: 30, price: 15, sub: "Clover and Pip", photo: "lib:dogs", goto: "time" },
      { name: "Long walk", minutes: 60, price: 25, photo: "lib:dogs", goto: "time" },
    ],
  },
  { services: walkingServices },
  { density: "compact", services: walkingServices },
  { surface: "outlined", services: walkingServices },
  { detail: "brief", services: walkingServices },
  { lead: "none", services: walkingServices },
  { services: [{ ...walkingServices[0]!, tone: "good" }, walkingServices[1]!] },
  { services: [walkingServices[0]!, { ...walkingServices[1]!, mark: "muted" }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ServiceMenu");
export const probes = [
  choose("Let clients book one of my services, grouped by type, with minutes and a price for each"),
  choose("Show several plants with short details and a link to open each", "List"),
  write("Offer a 30 minute park walk for 15 and a 60 minute walk for 25, both opening time"),
  {
    ...write(
      "Offer a 30-minute park walk for 15, opening time. Save the description 'With Clover and Pip' but show only the service name, duration and price, with no descriptive line.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Book the plant care visit", { address: "s1/r1", action: "press" }),
] satisfies Probe[];
// prettier-ignore
function ServiceText({ value, part, density, role = "body", tone = "text" }:
  { value: string; part: string | null; density: ThemeDensity; role?: TextRole; tone?: TextTone }) {
  const loading = useComponentState() === "loading";
  if (loading) return <KitSkeleton density={density} shape="figure" inset="none" content={[[role, value, "start", "compact"]]} />;
  return <KitText {...{ role, tone, density, part }} numberScale="compact" tabular={role === "number"}>{value}</KitText>;
}
type MenuProps = Props<typeof props, typeof meta>;
// prettier-ignore
function ServiceDetails({ service, density, lang }: { service: MenuProps["services"][number]; density: ThemeDensity; lang: string }) {
  const duration = <ServiceText {...{ density }} value={durationLine(service.minutes, lang)} role="number" tone="muted" part="minutes" />;
  const content = <>
    <ServiceText {...{ density }} value={service.name} part="name" />
    {service.price === undefined ? duration : (
      <KitContent lead={duration} leadingAlign="row" density={density}>
        <ServiceText {...{ density }} value={servicePrice(service.price, lang)} role="number" tone="muted" part="price" />
      </KitContent>
    )}
    {service.sub && <ServiceText {...{ density }} value={service.sub} role="caption" tone="muted" part="sub" />}
  </>;
  return density === "compact" ? content : <KitContent>{content}</KitContent>;
}
// prettier-ignore
function ServiceRows({ services, density, style, surface }: MenuProps & { density: ThemeDensity }) {
  const { lang, words } = useWords();
  const { bookLabel } = bookingWordsFor(lang);
  const loading = useComponentState() === "loading";
  const photos = services.some((service) => service.photo);
  const context = usePartContext();
  return (
    <>
      {services.flatMap((service, index) => [
        ...(service.group && service.group !== services[index - 1]?.group ? [
          <PartContext.Provider key={`${service.id}/group`} value={{ ...context, item: service.id }}>
            <KitRow part={null} label={service.group}>
              <ServiceText {...{ density }} value={service.group} role="caption" tone="muted" part="group" />
            </KitRow>
          </PartContext.Provider>,
        ] : []),
        <KitRow
          key={service.id}
          item={service.id}
          tone={service.tone}
          mark={service.mark}
          surface={style === "cards" ? surface : undefined}
          label={loading ? words.loadingLabel : service.name}
          goto={loading ? undefined : service.goto}
          leadingAlign="row"
          leadingWidth={photos ? "avatar" : undefined}
          leading={service.photo && <KitPhoto photo={service.photo} label={service.name} part="photo" />}
          trailing={<ServiceText {...{ density }} value={bookLabel} role="caption" tone="accent" part={null} />}
        >
          <ServiceDetails {...{ service, density, lang }} />
        </KitRow>,
      ])}
    </>
  );
}

export function ServiceMenu(input: MenuProps) {
  const state = useComponentState();
  const { style, surface } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  return (
    <KitCard style={state === "empty" ? "inset" : (style ?? "inset")} surface={surface} density={density}>
      {state === "empty" ? (
        <KitEmpty decorativeIcon part="empty" />
      ) : (
        <ServiceRows {...input} density={density} />
      )}
    </KitCard>
  );
}
