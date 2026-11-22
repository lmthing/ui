import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { deliveryCopy, deliveryPreview, deliveryReading } from "../copy";
import { placesWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-DeliveryTracker.generated";

// Core first: Route/default shows ordered stops, not a live courier, destination and delivery ETA.
export const meta = {
  id: "DeliveryTracker",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A delivery service supplies the live courier location and arrival estimate.",
  variants: {
    media: ["thumb", "none"],
  },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "map", "eta", "step", "courier", "photo", "call", "call_label", "call_icon"],
  states: ["filled", "loading", "success"],
  readSuccess: true,
  live: {},
  actions: { parts: { call: ["press"] }, when: { call: { callable: true } } },
  deviceData: ["delivery_tracking"],
  previewDeviceData: ({ input }): c.DeviceData => deliveryPreview(input as z.output<typeof props>),
  read: (input, state, lang, data): string[] =>
    deliveryReading(input as z.output<typeof props>, state, data, lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    step: z.enum(["preparing", "picked_up", "on_the_way", "nearby", "delivered"]),
    courier: c.text(20).optional(),
    photo: c.photo.optional(),
  })
  .overwrite((value) => ({
    ...value,
    callable: value.courier !== undefined && value.step !== "delivered",
    photo: value.media === "none" ? undefined : value.photo,
  }));

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { step: "preparing" };
}

const potDelivery = { step: "on_the_way", courier: "Nia", photo: "lib:people" } as const;
export const examples = [
  potDelivery,
  { step: "nearby", courier: "Sam" },
  { ...potDelivery, media: "none" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("DeliveryTracker");
export const probes = [
  choose(
    "Show the courier bringing my plant pots on a live map with their ETA, current step, and a call button",
  ),
  choose("Show the planned walk in visiting order from home to the park gate, the pond, then home", "Route"),
  write("Track my pot delivery. Nia picked it up and is on the way. Use lib:people as her photo."),
  {
    ...write("My courier Nia is on the way. Keep her lib:people photo attached but hide it on the tracker."),
    variant: { axis: "media", value: "none" },
  },
  read("Call my courier Nia", { address: "d1/call", action: "press" }),
] satisfies c.Probe[];

type DeliveryProps = c.Props<typeof props, typeof meta>;
type DeliveryCopy = ReturnType<typeof deliveryCopy>;

// prettier-ignore
function DeliveryHeading({ display, loading, etaLabel, density }: {
  display: DeliveryCopy; loading: boolean; etaLabel: string; density: c.ThemeDensity;
}) {
  const { delivered, eta, timed, step } = display;
  const etaRole = timed ? "number" : "label";
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={eta ? [["label", etaLabel], [etaRole, eta], ["label", step]] : [["title", step]]} />;
  return <kit.KitContent density={density}>
    {eta && <>
      <kit.KitText part={null} role="label" tone="muted" density="comfortable">{etaLabel}</kit.KitText>
      <kit.KitText part="eta" role={etaRole} tabular={timed} density="comfortable">{eta}</kit.KitText>
    </>}
    <kit.KitText part="step" role={delivered ? "title" : "label"} tone={delivered ? "good" : "muted"} density="comfortable">{step}</kit.KitText>
  </kit.KitContent>;
}

// prettier-ignore
function DeliveryContact({ courier, photo, call, courierLabel, density, loading }: {
  courier: string | undefined; photo: string | undefined; call: string | undefined; courierLabel: string | undefined;
  density: c.ThemeDensity; loading: boolean;
}) {
  if (!courier && !photo) return null;
  const avatar = photo && (loading
    ? <kit.KitPhoto part="photo" shape="round" />
    : <kit.KitPhoto part="photo" shape="round" {...{ photo }} {...(courier ? { label: courier } : {})} />);
  const name = <kit.KitContent lead={avatar} leadingAlign="row" density={density}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["label", courier], ["label", courierLabel]]} /> : <>
        {courier && <kit.KitText part="courier" role="label" emphasis="strong" density="comfortable">{courier}</kit.KitText>}
        {courierLabel && <kit.KitText part={null} role="label" tone="muted" density="comfortable">{courierLabel}</kit.KitText>}
    </>}
  </kit.KitContent>;
  return call ? <kit.KitGrid fitLast density={density}>
    {name}
    <kit.KitAction part="call" action="press" kind="secondary" icon="phone" label={call} />
  </kit.KitGrid> : name;
}

// prettier-ignore
export function DeliveryTracker(input: DeliveryProps) {
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useKit().density;
  const surface = "card";
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const { lang, words } = kit.useWords(placesWordsFor);
  const display = deliveryCopy(input, state, kit.useDeviceData(), lang);
  return <kit.KitCard part="root" style="inset" padded {...{ density, surface }}>
    <DeliveryHeading {...{ display, loading, density }} etaLabel={words.deliveryEta} />
    {loading ? <kit.KitCard part="map" style="plain">
      <kit.KitSkeleton shape="media" inset="none" content={[]} />
    </kit.KitCard> : <kit.KitMapTile part="map" pins={display.pins} />}
    {(input.courier || (media === "thumb" && input.photo)) && <kit.KitContent group="response" density={density}>
      <DeliveryContact courier={input.courier} photo={media === "thumb" ? input.photo : undefined}
        call={display.call} courierLabel={display.courierLabel} {...{ density, loading }} />
    </kit.KitContent>}
  </kit.KitCard>;
}
