import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { shiftActionFlags, shiftActionLabels, shiftDetails, shiftReading, shiftSchedule } from "../copy";
import { teamWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Shift.generated";

// Core first: Card/plain previews a record but cannot express shift status and separate swap and offer actions.
export const meta = {
  id: "Shift",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The shift is a record in a shared rota.",
  variants: { detail: ["full", "brief"] },
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
  { ...morningShift },
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
  schedule: { date, from, to }, status, separator, density,
}: {
  schedule: ReturnType<typeof shiftSchedule>;
  status: string;
  separator: string;
  density: c.ThemeDensity;
}) {
  return (
    <kit.KitContent density={density}>
      <kit.KitFigure density={density}
        value={{ text: from, part: "from" }}
        unit={{ text: `${separator}${to}`, part: "to", role: "figure", tone: "text", tabular: true }} />
      <kit.KitGrid fitLast density={density}>
        <kit.KitLayoutText line={{ text: date, part: "date", role: "meta", tone: "muted" }} density={density} />
        <kit.KitLayoutText line={{ text: status, part: "status", role: "meta", tone: "muted" }} density={density} />
      </kit.KitGrid>
    </kit.KitContent>
  );
}

export function Shift(input: c.Props<typeof props, typeof meta>) {
  const loading = kit.useComponentState() === "loading";
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitState density={density} loading={<ShiftBody {...{ input, detail, density, loading }} />}>
        <ShiftBody {...{ input, detail, density, loading }} />
      </kit.KitState>
    </kit.KitCard>
  );
}

function ShiftBody({
  input,
  detail,
  density,
  loading,
}: {
  input: c.Props<typeof props, typeof meta>;
  detail: c.AxisValue<"detail">;
  density: c.ThemeDensity;
  loading: boolean;
}) {
  const { lang, words } = kit.useWords(teamWordsFor);
  const labels = shiftActionLabels(input.status, lang);
  const { canSwap, canOffer } = shiftActionFlags(input.status);
  return (
    <>
      <ShiftHeader
        schedule={shiftSchedule(input, lang)}
        status={words.shiftStatus[input.status]}
        separator={words.shiftTimeSeparator}
        density={density}
      />
      <kit.KitContent group="response" density={density}>
        <ShiftDetails details={shiftDetails({ ...input, detail }, lang)} {...{ density, loading }} />
      </kit.KitContent>
      <kit.KitActionFooter density={density}>
        <kit.KitAction part="swap" kind="secondary" label={labels.swap} disabled={!canSwap} />
        <kit.KitAction part="offer" kind="quiet" label={labels.offer} disabled={!canOffer} />
      </kit.KitActionFooter>
    </>
  );
}
