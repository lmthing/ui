// prettier-ignore
import { KitCard, KitContent, KitEmpty, KitPhoto, KitRow, KitSkeleton, KitText,
  PartContext, type TextRole, type TextTone, useComponentState, usePartContext, useWords,
  useKit,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { serviceCapacity, serviceDeposit, servicePrice, serviceReading } from "../copy";
import { z } from "zod";
// prettier-ignore
import { detailOf, durationLine, itemsOf, itemVariantProps, photo, placeholderTitle, probesFor,
  screenId, text, thingOf, titleOf, type ThemeDensity, type FallbackInput,
  type Meta, type Probe, type Props,
  variantProps,
} from "../../../catalog";
import { prompt } from "../../../entry/prompt-ServiceMenu.generated";
export const meta = {
  id: "ServiceMenu",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Services stored on the device by the provider.",
  writeHints: prompt.writeHints,
  // prettier-ignore
  variants: { detail: ["full", "brief"], lead: ["thumb", "none"] },
  items: {
    key: "services",
    parts: ["root", "name", "minutes", "price", "sub", "group", "photo", "capacity", "deposit", "portfolio"],
    variants: { tone: ["neutral", "good"], mark: ["none", "muted"] },
  },
  variantParts: { "detail.brief": { hides: ["sub"] }, "lead.none": { hides: ["photo"] } },
  parts: ["root", "empty"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], portfolio: ["press"] } },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? serviceReading((input as z.output<typeof props>).services, lang) : [],
} as const satisfies Meta;
// prettier-ignore
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    services: z.array(z.strictObject({
      ...itemVariantProps(meta.items.variants),
      name: text(28),
      minutes: z.int().min(5).max(600),
      price: z.number().min(0).optional(),
      capacity: z.int().min(1).default(1),
      deposit: z.number().min(0).optional(),
      sub: text(60).optional(),
      group: text(20).optional(),
      photo: photo.optional(),
      goto: screenId,
      portfolio: z.strictObject({ goto: screenId }).optional(),
    })).min(1).max(12),
    style: z.literal("cards").optional(),
  })
  .overwrite((value) => ({
    ...value,
    services: value.services.map((service) => ({
      ...service,
      portfolio: service.portfolio,
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
  { services: walkingServices },
  { services: walkingServices },
  { detail: "brief", services: walkingServices },
  { lead: "none", services: walkingServices },
  { services: [{ ...walkingServices[0]!, tone: "good" }, walkingServices[1]!] },
  { services: [walkingServices[0]!, { ...walkingServices[1]!, mark: "muted" }] },
  { style: "cards", services: [
    { ...walkingServices[0]!, capacity: 4, deposit: 5, portfolio: { goto: "walks_gallery" } },
    walkingServices[1]!,
  ] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ServiceMenu");
// prettier-ignore
export const probes = [
  choose("Let clients book one of my services, grouped by type, with minutes and a price for each"),
  choose("Show several plants with short details and a link to open each", "List"),
  write("Offer a 30 minute park walk for 15 and a 60 minute walk for 25, both opening time"),
  {
    ...write("Offer a 30-minute park walk for 15, opening time. Save the description 'With Clover and Pip' but show only the service name, duration and price, with no descriptive line."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Book the plant care visit", { address: "s1/r1", action: "press" }),
  { ...write("Offer a 30-minute group park walk for 15 with up to four people per booking. Book through time."),
    expectProps: { services: [{ capacity: 4 }] } },
  { ...write("Offer a 30-minute park walk for 15 with a 5 deposit. Book through time."),
    expectProps: { services: [{ deposit: 5 }] } },
  { ...write("Offer a 30-minute park walk for 15. Book through time, and link separately to the walks_gallery screen for examples."),
    expectProps: { services: [{ goto: "time", portfolio: { goto: "walks_gallery" } }] } },
  { ...read("Open the portfolio for the park walk", { address: "s1/r1/portfolio", action: "press" }), screen: 9 },
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
    <ServiceText {...{ density }} value={service.name} part="name" role={service.capacity > 1 || service.deposit !== undefined || service.portfolio ? "heading" : "body"} />
    {service.price === undefined ? duration : (
      <KitContent lead={duration} leadingAlign="row" density={density}>
        <ServiceText {...{ density }} value={servicePrice(service.price, lang)} role="number" tone="muted" part="price" />
      </KitContent>
    )}
    {service.sub && <ServiceText {...{ density }} value={service.sub} role="caption" tone="muted" part="sub" />}
    {service.capacity > 1 && <ServiceText {...{ density }} value={serviceCapacity(service.capacity, lang)} role="caption" tone="muted" part="capacity" />}
    {service.deposit !== undefined && <ServiceText {...{ density }} value={serviceDeposit(service.deposit, lang)} role="caption" tone="muted" part="deposit" />}
  </>;
  return density === "compact" ? content : <KitContent>{content}</KitContent>;
}
// prettier-ignore
function ServiceRows({ services, density, style }: MenuProps & { density: ThemeDensity }) {
  const { lang, words } = useWords();
  const { bookLabel, servicePortfolio } = bookingWordsFor(lang);
  const loading = useComponentState() === "loading";
  const photos = services.some((service) => service.photo);
  const context = usePartContext();
  return services.flatMap((service, index) => {
    const { id, name, portfolio } = service;
    const grouped = Boolean(portfolio) && style === "cards";
    const row = <KitRow key={id} item={id} tone={service.tone} mark={service.mark}
      surface={grouped ? "plain" : style === "cards" ? "card" : undefined}
      label={loading ? words.loadingLabel : name} goto={loading ? undefined : service.goto} leadingAlign="row"
      leadingWidth={photos ? "avatar" : undefined}
      leading={service.photo && <KitPhoto photo={service.photo} label={name} part="photo" />}
      trailing={<ServiceText {...{ density }} value={bookLabel} role="caption" tone="accent" part={null} />}>
      <ServiceDetails {...{ service, density, lang }} />
    </KitRow>;
    const link = portfolio && <KitRow key={`${id}/portfolio`} item={id} part="portfolio"
      surface={grouped ? "plain" : undefined} label={servicePortfolio} goto={loading ? undefined : portfolio.goto} {...{ density }}>
      <ServiceText {...{ density }} value={servicePortfolio} role="label" tone="accent" part={null} />
    </KitRow>;
    const group = service.group && service.group !== services[index - 1]?.group &&
      <PartContext.Provider key={`${id}/group`} value={{ ...context, item: id }}>
        <KitRow part={null} label={service.group}>
          <ServiceText {...{ density }} value={service.group} role="caption" tone="muted" part="group" />
        </KitRow>
      </PartContext.Provider>;
    return [group, grouped ? <KitRow key={id} part={null} inline label={name} surface="card">{row}{link}</KitRow>
      : row, !grouped && link];
  });
}
// prettier-ignore
export function ServiceMenu(input: MenuProps) {
  const state = useComponentState();
  const { style } = input;
  const surface = "card";
  const density = useKit().density;
  return <KitCard style={state === "empty" ? "inset" : (style ?? "inset")} surface={surface} density={density}>
      {state === "empty" ? <KitEmpty decorativeIcon part="empty" /> : <ServiceRows {...input} density={density} />}
  </KitCard>;
}
