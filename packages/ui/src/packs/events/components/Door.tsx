import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { doorReading, doorSearchMax, doorSummary, projectDoor } from "../copy";
import { eventsWordsFor } from "../lang";
import { seedTitles } from "../seeds";
import { prompt } from "../../../entry/prompt-Door.generated";

// Core first: Camera/scan cannot reconcile arrivals or manually check in a named guest.
export const meta = {
  id: "Door",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "ok",
  realPath: "The camera scans codes with permission; multiple doors need a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["recent"] } },
  parts: [
    "root",
    "viewfinder",
    "hint",
    "scan",
    "scan_label",
    "arrivals",
    "recent",
    "search",
    "feedback",
    "no_match",
  ],
  items: { key: "results", parts: ["root", "name", "checkin", "checkin_label", "admitted"] },
  states: ["filled", "success", "error"],
  actions: {
    parts: { scan: ["scan"], search: ["type"] },
    items: { checkin: ["press"] },
    when: { scan: { scannerReady: true }, "checkin.press": { available: true } },
  },
  deviceData: ["doorTickets", "doorScanner", "doorFeedback"],
  previewDeviceData: previewDoor,
  live: { text: { search: { prop: "query", max: doorSearchMax } }, derive: projectDoor },
  successActions: ["scan.scan", "search.type", "checkin.press"],
  readSuccess: true,
  read: (input, state, lang) => doorReading(input as DoorReading, state, lang),
} as const satisfies c.Meta;

export const props = z.strictObject({ ...c.variantProps(meta.variants), hint: c.text(40) });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { hint: seedTitles(input, 40, 1)[0]! };
}

export const examples = [
  { hint: "Scan a Harbour Benefit pass" },
  { hint: "Scan a Harbour Reunion pass" },
] satisfies z.input<typeof props>[];

function previewDoor({ input, state }: { input: Readonly<c.Values>; state: c.StateName }): c.DeviceData {
  const guests =
    input.hint === examples[0]!.hint
      ? ["Imani Cole", "Hugo Wells", "Rae Price", "Ruth Shah"]
      : ["Mara Chen", "Lee Ortiz", "Dev Malik"];
  return {
    doorScanner: ["c1", "d1"],
    doorTickets: ["c1", "d1"].flatMap((instance) =>
      guests.map((name, index) => ({
        instance,
        id: `r${index + 1}`,
        name,
        ...(state === "success" && index === 2
          ? { arrivedAt: 3 }
          : index < 2
            ? { arrivedAt: 2 - index }
            : {}),
      })),
    ),
  };
}

const { choose, write, read } = c.probesFor("Door");
export const probes = [
  choose(
    "At the gala entrance scan admission codes to check people in, show arrivals against tickets sold and let me find a guest by name for manual check-in.",
  ),
  choose(
    "Let me point my phone at the decorations and take a new picture. No tickets, guest list or check-in.",
    "Camera",
  ),
  write("Set up check-in for a benefit gala, with the instruction 'Scan a Harbour Benefit pass'."),
  {
    ...write(
      "Set up check-in for the benefit gala. Say 'Scan a Harbour Benefit pass'. Keep the scan and manual lookup, but do not show recent arrivals.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Scan the next guest's ticket at the entrance.", { address: "d1/scan", action: "scan" }),
] satisfies c.Probe[];

type DoorReading = ReturnType<typeof projectDoor> & { detail?: c.AxisValue<"detail"> | undefined };
type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;

// prettier-ignore
function ManualCheckIn({ live, density }: { live: DoorReading; density: Density }) {
  const { words: { door } } = kit.useWords(eventsWordsFor);
  return <kit.KitContent group="response" density={density}>
    <kit.KitInput part="search" kind="search" hint={door.search} value={live.query} />
    <kit.KitRowGroup density={density} separators={false}>
    {live.results.map(({ id, name, available }) => (
      <kit.KitRow item={id} key={id} label={name} inline density={density}
        trailing={available ? <kit.KitAction part="checkin" kind="quiet" label={door.checkin} />
          : <kit.KitText part="admitted" role="label" tone="muted">{door.admitted}</kit.KitText>}>
        <kit.KitMetaLine title={{ part: "name", text: name }} density={density} />
      </kit.KitRow>
    ))}
    </kit.KitRowGroup>
    {Boolean(live.query.trim()) && !live.results.length &&
      <kit.KitText part="no_match" role="label" tone="muted">{door.noMatch}</kit.KitText>}
  </kit.KitContent>;
}

// prettier-ignore
export function Door(input: View) {
  const { lang, words: { door } } = kit.useWords(eventsWordsFor);
  const state = kit.useComponentState();
  const { screen, component } = kit.usePartContext();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const query = kit.useControlValue(`${screen}/${component}/$type/search`, "");
  const live = projectDoor({ query }, component, kit.useDeviceData());
  const summary = doorSummary({ ...live, detail }, state, lang);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="feedback" retain message={summary.feedback} density={density}>
    <kit.KitFigure value={{ part: "arrivals", text: summary.arrivals, role: live.expected ? "figure" : "body" }}
      unit={{ text: door.arrivals }} density={density}
      caption={<kit.KitLayoutText line={{ part: "recent", text: summary.recent, role: "meta", tone: "muted" }} density={density} />} />
    {state !== "error" && <>
      <kit.KitContent group="response" density={density}>
        <kit.KitViewfinder kind="scan" hint={input.hint} hintPart="hint" />
        <kit.KitContent group="response" density={density}>
          <kit.KitAction part="scan" action="scan" label={door.scan} disabled={!live.scannerReady} full />
        </kit.KitContent>
      </kit.KitContent>
      <ManualCheckIn {...{ live, density }} />
    </>}
    </kit.KitState>
  </kit.KitCard>;
}
