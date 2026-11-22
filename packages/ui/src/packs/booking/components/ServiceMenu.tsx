// prettier-ignore
import { KitCard, KitContent, KitGrid, KitLayoutText, KitPhoto, KitRow, KitRowGroup, KitState, KitText,
  PartContext, useComponentState, usePartContext, useKit, useWords,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { serviceCapacity, serviceDeposit, serviceDepositAmount, servicePrice, serviceReading } from "../copy";
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
type MenuProps = Props<typeof props, typeof meta>;
type Service = MenuProps["services"][number];
const supporting = { role: "caption", tone: "muted" } as const;

function Deposit({ deposit, density, lang }: { deposit: number; density: ThemeDensity; lang: string }) {
  const amount = serviceDepositAmount(deposit, lang);
  const [before, after] = serviceDeposit(deposit, lang).split(amount, 2);
  return (
    <KitText {...supporting} part="deposit" density={density}>
      {before}
      <KitText role="number" numberScale="compact" tabular emphasis="strong" part={null} density={density}>
        {amount}
      </KitText>
      {after}
    </KitText>
  );
}

// prettier-ignore
function ServiceDetails({ service, density, lang }: { service: Service; density: ThemeDensity; lang: string }) {
  const duration = <KitLayoutText line={{ ...supporting, tabular: true,
    text: durationLine(service.minutes, lang), part: "minutes" }} density={density} />;
  return <KitContent density={density} rhythm={density === "compact" ? "flush" : "close"}>
    <KitLayoutText line={{ text: service.name, part: "name", strong: true }} density={density} />
    {service.price === undefined ? duration : <KitGrid fitLast density={density}>
      {duration}
      <KitLayoutText line={{ ...supporting, tabular: true, text: servicePrice(service.price, lang), part: "price" }}
        align="end" density={density} />
    </KitGrid>}
    <KitLayoutText line={{ ...supporting, text: service.sub, part: "sub" }} density={density} />
    {service.capacity > 1 && <KitLayoutText line={{ ...supporting,
      text: serviceCapacity(service.capacity, lang), part: "capacity" }} density={density} />}
    {service.deposit !== undefined && <Deposit deposit={service.deposit} {...{ density, lang }} />}
  </KitContent>;
}
// prettier-ignore
function ServiceItem({ service, density, style, tight }: Pick<MenuProps, "style"> & {
  service: Service; density: ThemeDensity; tight: boolean;
}) {
  const { lang, words: { bookLabel, servicePortfolio } } = useWords(bookingWordsFor);
  const loading = useComponentState() === "loading";
  const { id, name, portfolio } = service;
  const grouped = Boolean(portfolio) && style === "cards";
  const tone = service.tone === "neutral" && service.mark === "muted" ? "muted" : service.tone;
  const row = <KitRow item={id} tone={tone} mark={service.mark} density={density} inline={tight}
      part={loading ? null : "root"}
      surface={tone === "good" ? "tinted" : tone === "muted" ? undefined
        : grouped ? "plain" : style === "cards" ? "card" : undefined}
      label={name} goto={loading ? undefined : service.goto} leadingAlign="row"
      leading={service.photo && <KitPhoto photo={service.photo} label={name} part={loading ? null : "photo"} loading={loading} />}
      trailing={<KitLayoutText line={{ text: bookLabel, role: "caption", tone: "accent" }} density={density} />}>
      <ServiceDetails {...{ service, density, lang }} />
    </KitRow>;
  const link = portfolio && <KitRow item={id} part={loading ? null : "portfolio"}
    surface={grouped ? "plain" : undefined} label={servicePortfolio} goto={loading ? undefined : portfolio.goto} {...{ density }}>
    <KitLayoutText line={{ text: servicePortfolio, role: "caption", tone: "accent" }} density={density} />
  </KitRow>;
  if (grouped) return <KitRow part={null} inline label={name} surface="card">{row}{link}</KitRow>;
  return <>{tight ? <KitContent inset="md" density={density}>{row}</KitContent> : row}{link}</>;
}
// prettier-ignore
function ServiceRows({ services, density, style }: MenuProps & { density: ThemeDensity }) {
  const context = usePartContext();
  const cards = style === "cards";
  const groups: Service[][] = [];
  for (const service of services) {
    const group = groups.at(-1);
    if (group && group[0]!.group === service.group) group.push(service);
    else groups.push([service]);
  }
  return groups.map((rows, index) => {
    const { id, group } = rows[0]!;
    return <KitContent key={id} density={density} group={index ? "response" : "content"}>
      {group && <PartContext.Provider value={{ ...context, item: id }}>
        <KitContent inset="md" density={density}>
          <KitLayoutText line={{ ...supporting, text: group, part: "group" }} density={density} />
        </KitContent>
      </PartContext.Provider>}
      <KitRowGroup density={density} separators={!cards && !group} spacing={cards || group ? "groups" : "rows"}
        leadingWidth={!cards && services.some((service) => service.photo) ? "avatar" : undefined}>
        {rows.map((service) => <ServiceItem key={service.id} {...{ service, density, style }}
          tight={Boolean(group) && !cards} />)}
      </KitRowGroup>
    </KitContent>;
  });
}
// prettier-ignore
export function ServiceMenu(input: MenuProps) {
  const state = useComponentState();
  const { style } = input;
  const density = useKit().density;
  const rows = <ServiceRows {...input} density={density} />;
  return <KitCard style={state === "empty" ? "inset" : (style ?? "inset")} surface="card" density={density}
    padded={state !== "empty" && style !== "cards"} inset="none">
      <KitState loading={rows} part="empty" density={density}>{rows}</KitState>
  </KitCard>;
}
