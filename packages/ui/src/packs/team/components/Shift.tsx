import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { shiftActionFlags, shiftActionLabels, shiftDetails, shiftReading, shiftSchedule } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Card/plain previews a record but cannot express shift status and separate swap and offer actions.
export const meta = {
  id: "Shift",
  status: "ready",
  group: "content",
  purpose: "See one assigned shift and ask to swap it or offer it to someone else.",
  pick: "One assigned staff shift with start and end times, coworkers and swap or offer actions. Not a record preview (Card), the whole rota (Roster), or a client's booking (Appointment).",
  writeHints: [
    'Use detail "brief" only when asked to hide where and with whom; retain those values in place and with. A request to hide details does not change row spacing: set density to null unless tighter spacing is specifically requested. Set detail to null for the normal card.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The shift is a record in a shared rota.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["place", "with"] } },
  parts: ["root", "date", "from", "to", "place", "role", "with", "status", "swap", "offer"],
  states: ["filled", "loading"],
  actions: {
    parts: { swap: ["press"], offer: ["press"] },
    when: { swap: { canSwap: true }, offer: { canOffer: true } },
  },
  read: (input, _state, lang): string[] => shiftReading(input as z.output<typeof props>, lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    date: c.isoDate,
    from: c.clock,
    to: c.clock,
    // The custom reader controls detail order and visibility without discarding authored values.
    place: c.text(28).optional().meta({ kind: undefined }),
    role: c.text(16).optional().meta({ kind: undefined }),
    with: c.text(48).optional().meta({ kind: undefined }),
    status: z.enum(["confirmed", "offered", "swap_requested"]),
  })
  .overwrite((value) => ({ ...value, ...shiftActionFlags(value.status) }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item] = c.itemsOf(cast, 1);
  const thing = c.thingOf(cast);
  return {
    date: "2026-11-16",
    from: "09:00",
    to: "12:00",
    role: (item && c.titleOf(item, 16, thing)) ?? c.placeholderTitle(0, lang),
    place: item && c.detailOf(item, 28, thing),
    status: "confirmed",
  };
}

const morningShift = {
  date: "2026-11-16",
  from: "07:00",
  to: "12:00",
  place: "East greenhouse",
  role: "Morning care",
  with: "Anna and Rae",
  status: "confirmed",
} satisfies z.input<typeof props>;

export const examples = [
  morningShift,
  {
    date: "2026-11-21",
    from: "08:00",
    to: "13:00",
    place: "Riverside",
    role: "Park walks",
    with: "Sam",
    status: "swap_requested",
  },
  { ...morningShift, density: "compact" },
  { ...morningShift, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Shift");
export const probes = [
  choose(
    "Show my one assigned work shift with hours, location and coworkers, and let me ask for a swap or offer it to someone else.",
  ),
  choose(
    "Show a static preview for a greenhouse with a short title, photo and description, without staff schedules or work actions.",
    "Card",
  ),
  write("Show my confirmed 2026-11-16 shift, 07:00–12:00, at East greenhouse with Anna, role Morning care."),
  {
    ...write(
      "Show my confirmed 2026-11-16 shift, 07:00–12:00. Save East greenhouse and Anna, but hide where and with whom from this card.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Ask to swap my morning care shift", { address: "s1/swap", action: "press" }),
] satisfies c.Probe[];

// prettier-ignore
function ShiftDetails({ details, density, loading }: {
  details: ReturnType<typeof shiftDetails>; density: c.ThemeDensity; loading: boolean;
}) {
  if (!details.length) return null;
  if (loading)
    return (
      <kit.KitSkeleton
        shape="figure"
        inset="none"
        density={density}
        content={details.map(({ part, prefix, text }) => [part === "role" ? "body" : "label", `${prefix}${text}`])}
      />
    );
  return (
    <kit.KitContent density={density}>
      {details.map(({ part, prefix, text }) => (
        <kit.KitText key={part} part={part} role={part === "role" ? "body" : "label"}
          tone={part === "role" ? "text" : "muted"} density={density}>
          {prefix && (
            <kit.KitText part={null} role="label" tone="muted" density={density}>{prefix}</kit.KitText>
          )}
          {text}
        </kit.KitText>
      ))}
    </kit.KitContent>
  );
}

// prettier-ignore
function ShiftHeader({
  schedule: { date, from, to, range }, status, separator, density, loading,
}: {
  schedule: ReturnType<typeof shiftSchedule>;
  status: string;
  separator: string;
  density: c.ThemeDensity;
  loading: boolean;
}) {
  const compact = density === "compact";
  const labels = (
    <kit.KitGrid fitLast density={density}>
      {loading
        ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", date]]} />
        : <kit.KitText part="date" role="label" tone="muted" density={density}>{date}</kit.KitText>}
      {loading
        ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", status]]} />
        : <kit.KitText part="status" role="label" tone="muted" density={density}>{status}</kit.KitText>}
    </kit.KitGrid>
  );
  return (
    <kit.KitContent group="response" density={density}>
      {loading
        ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["number", range]]} />
        : <kit.KitText part={null} role="number" lines={1} tabular density={density}>
            <kit.KitText part="from" role="number" tabular density={density}>{from}</kit.KitText>
            {separator}
            <kit.KitText part="to" role="number" tabular density={density}>{to}</kit.KitText>
          </kit.KitText>}
      <kit.KitContent group={compact ? "content" : "response"} density={density}>
        {labels}
      </kit.KitContent>
    </kit.KitContent>
  );
}

export function Shift(input: c.Props<typeof props, typeof meta>) {
  const loading = kit.useComponentState() === "loading";
  const { lang, words } = kit.useWords(teamWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const labels = shiftActionLabels(input.status, lang);
  const { canSwap, canOffer } = shiftActionFlags(input.status);
  return (
    <kit.KitCard part="root" padded density={density}>
      <ShiftHeader
        schedule={shiftSchedule(input, lang)}
        status={words.shiftStatus[input.status]}
        separator={words.shiftTimeSeparator}
        {...{ density, loading }}
      />
      <ShiftDetails details={shiftDetails({ ...input, detail }, lang)} {...{ density, loading }} />
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid density={density}>
          <kit.KitAction part="swap" kind="secondary" label={labels.swap} disabled={!canSwap} full />
          <kit.KitAction part="offer" kind="quiet" label={labels.offer} disabled={!canOffer} full />
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitCard>
  );
}
