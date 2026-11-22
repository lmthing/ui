import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { departuresCopy, departuresReading } from "../copy";
import { placesWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Departures.generated";

// Core first: Timeline/hours cannot show live countdowns and delays for transit lines leaving one stop.
export const meta = {
  id: "Departures",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "Live departure times come from a transit data service.",
  variants: {
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["delay"] } },
  items: { key: "rows", parts: ["root", "line", "to", "minutes", "delay", "crowding"] },
  parts: ["root", "stop", "more", "empty", "alerts"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  live: {}, // Keep row press unavailable outside the filled state in the action planner.
  deviceData: ["departures"],
  previewDeviceData: ({ input, state }): c.DeviceData => {
    if (state === "empty") return {};
    const { stop, rows } = input as z.output<typeof props>;
    const minutes = [2, 8, 14];
    return {
      departures: [
        {
          stop,
          rows: rows.map((row, index) => ({ ...row, minutes: minutes[index], delay: index === 1 ? 4 : 0 })),
          total: rows.length + 2,
        },
      ],
    };
  },
  read: (input, state, lang, data): string[] =>
    state === "filled" ? departuresReading(input as z.output<typeof props>, data, lang) : [],
} as const satisfies c.Meta;

const rowProps = z.strictObject({
  line: c.text(6),
  to: c.text(28),
  crowding: z.enum(["low", "medium", "high"]).optional(),
});
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  stop: c.text(32),
  rows: z.array(rowProps).min(1).max(6),
  alerts: z
    .array(
      z.strictObject({
        line: c.text(6),
        severity: z.enum(["info", "warn", "critical"]),
        text: c.text(60),
      }),
    )
    .min(0)
    .max(3)
    .optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [stop, ...destinations] = c.itemsOf(cast, 4);
  return {
    stop: (stop && c.titleOf(stop, 32, thing)) || c.placeholderTitle(0, lang),
    rows: (destinations.length ? destinations : [undefined]).map((item, index) => ({
      line: c.placeholderValue,
      to: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(index + 1, lang),
    })),
  };
}

export const examples = [
  {
    stop: "Nursery Gate",
    rows: [
      { line: "24", to: "City Centre" },
      { line: "24A", to: "Botanic Gardens" },
      { line: "31", to: "Plant Market" },
    ],
  },
  {
    stop: "Alder Park",
    rows: [
      { line: "8", to: "Clifton" },
      { line: "9", to: "Riverside" },
    ],
  },
  {
    stop: "Alder Park",
    rows: [
      { line: "8", to: "Clifton", crowding: "low" },
      { line: "9", to: "Riverside", crowding: "high" },
    ],
    alerts: [{ line: "9", severity: "warn", text: "Use the stop across the street" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Departures");
// prettier-ignore
export const probes = [
  choose("At my bus stop show what leaves next, with live minutes to departure and a warning when a bus is delayed"),
  choose("Show today's itinerary by time: meet at 09:00, nursery tour at 10:00, lunch at noon", "Timeline"),
  write("At Nursery Gate show upcoming buses: line 24 to City Centre and line 24A to Botanic Gardens."),
  {
    ...write("Show the next buses from Alder Park: line 8 to Clifton and line 9 to Riverside. Show the live countdown and flag late buses, but hide how many minutes late they are."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open bus 24A to Botanic Gardens", { address: "d1/r2", action: "press" }),
  {
    ...write('At Alder Park show line 9 to Riverside. Add a line 9 service alert at the warning (warn) level, not info or critical, with this exact text: "Use the stop across the street"'),
    expectProps: { alerts: [{ line: "9", severity: "warn", text: "Use the stop across the street" }] },
  },
  {
    ...write("At Alder Park show line 8 to Clifton with low crowding and line 9 to Riverside with high crowding."),
    expectProps: { rows: [{ line: "8", to: "Clifton", crowding: "low" }, { line: "9", to: "Riverside", crowding: "high" }] },
  },
] satisfies c.Probe[];

type DeparturesProps = c.Props<typeof props, typeof meta>;
type DepartureCopy = ReturnType<typeof departuresCopy<DeparturesProps["rows"][number]>>;
type Density = c.ThemeDensity;
// prettier-ignore
function DepartureRows({ rows, density, loading }: { rows: DepartureCopy["rows"]; density: Density; loading: boolean }) {
  return <kit.KitRowGroup density={density} leadingWidth="avatar">
    {rows.map(({ id, line, to, label, minutes, late, delay, tone, countdown, crowd }) => {
      const next = loading
        ? <kit.KitLayoutText density={density} align="end" line={{ text: countdown, role: "figure", compact: true, tabular: true, lines: 1 }} />
        : <kit.KitText role="number" numberScale="compact" tabular part="minutes" tone={tone}
            density={density}>{minutes}{late && <kit.KitText part={null} role="label" tone="warn" density={density}>{late}</kit.KitText>}</kit.KitText>;
      return <kit.KitRow key={id} item={id} {...(loading ? { part: null } : { role: "button" as const })}
        label={label} inset="none" density={density}
        leading={<kit.KitTrail kind="badge" part="line" value={line} tone="text" density={density} />}
        trailing={crowd ? <kit.KitContent density={density} lineRole="body"
          lead={<kit.KitTrail kind="badge" part="crowding" tone={crowd.tone} value={crowd.text} density={density} />}>{next}</kit.KitContent> : next}>
        <kit.KitMetaLine density={density} title={{ text: to, part: "to" }} meta={{ text: delay, part: "delay", tone: "warn" }} />
      </kit.KitRow>;
    })}
  </kit.KitRowGroup>;
}

function DepartureAlerts({ alerts, density }: { alerts: DepartureCopy["alerts"]; density: Density }) {
  const { words } = kit.useWords(placesWordsFor);
  if (!alerts.length) return null;
  return (
    <kit.KitRow part="alerts" label={words.departureAlerts} inset="none" density={density}>
      <kit.KitContent density={density}>
        {alerts.map(({ title, text, tone }, index) => (
          <kit.KitMetaLine
            key={index}
            density={density}
            title={{ text: title, role: "meta", tone, strong: true }}
            meta={{ text }}
          />
        ))}
      </kit.KitContent>
    </kit.KitRow>
  );
}

// prettier-ignore
export function Departures(input: DeparturesProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words } = kit.useWords(placesWordsFor);
  const thing = kit.useEmptyThing();
  const { rows, more, alerts } = departuresCopy({ ...input, detail }, kit.useDeviceData(), lang);
  const loading = state === "loading";
  const content = <>
    <DepartureRows {...{ rows, density, loading }} />
    {!loading && <DepartureAlerts {...{ alerts, density }} />}
    <kit.KitLayoutText density={density} line={{ text: more, part: "more", role: "meta", tone: "muted" }} />
  </>;
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitHeader density={density} align={state === "empty" ? "center" : "start"}
        title={{ text: input.stop, part: "stop" }} />
      <kit.KitState part="empty" icon="clock" density={density} loading={content}
        message={thing ? c.emptyLine(thing, lang) : words.departuresEmpty}>{content}</kit.KitState>
    </kit.KitCard>
  );
}
