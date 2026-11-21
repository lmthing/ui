import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import type { Definition } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitAction,
  KitMapTile,
  KitPhotoCompare,
  KitProvider,
  KitTable,
  KitText,
  PartScope,
  useControlValue,
} from "@lmthing/ui/kit";
import { config } from "../../render";
import { DateSpanFixture, dateSpanDefinition, dateSpanEntry } from "./date-span.fixture";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const guide = {
  meta: {
    id: "TimelineFixture",
    tier: "phone",
    group: "data",
    region: "body",
    weight: 1,
    purpose: "Browse broadcasts.",
    pick: "Timeline test fixture.",
    realPath: "Read the lineup.",
    jump: ["now"],
    parts: ["now"],
    items: { key: "shows", parts: ["root"] },
    actions: { parts: { now: ["press"] }, items: { root: ["press"] } },
  },
  props: z.strictObject({ shows: z.array(z.strictObject({ title: z.string() })) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} as const satisfies Definition;
const photo = {
  ...guide,
  meta: {
    id: "CompareFixture",
    tier: "phone",
    group: "input",
    region: "body",
    weight: 1,
    purpose: "Compare images.",
    pick: "Photo comparison fixture.",
    realPath: "Compare local photos.",
    parts: ["split"],
    actions: { parts: { split: ["set"] } },
    set: { split: { prop: "split", min: 0, max: 100, integer: true } },
  },
  props: z.strictObject({ split: z.int().min(0).max(100) }),
} satisfies Definition;
const events: string[] = [];
const controller = createScreenController({
  defs: { TimelineFixture: guide, CompareFixture: photo, FareDateFixture: dateSpanDefinition },
  screen: {
    id: "home",
    components: [
      { c: guide.meta.id, id: "guide", shows: [{ title: "Weather bulletin" }] },
      { c: photo.meta.id, id: "photo", split: 50 },
      dateSpanEntry,
    ],
  },
  onAction: ({ address, action }) => events.push(`${address} ${action}`),
  requireMounted: true,
});
declare global {
  interface Window {
    extensionController: typeof controller;
    extensionEvents: string[];
  }
}
window.extensionController = controller;
window.extensionEvents = events;

const text = (label: string) => <KitText part={null}>{label}</KitText>;
const columns = Array.from({ length: 8 }, (_, at) => ({
  id: String(at),
  label: `${at}:00`,
  header: text(`${at}:00`),
}));
const rows = [
  {
    id: "weather",
    label: "Weather",
    heading: text("Weather"),
    cells: [
      {
        id: "bulletin",
        label: "Weather bulletin",
        start: 4,
        span: 2,
        target: { item: "r1", part: "root" },
        content: text("Weather bulletin"),
      },
    ],
  },
];

function Compare({ loading, missing }: { loading: boolean; missing: boolean }) {
  const split = useControlValue("home/photo/split", 50);
  return (
    <PartScope screen="home" component="photo" rev={1} state={loading ? "loading" : "filled"}>
      <KitPhotoCompare
        beforePhoto="before"
        afterPhoto={missing ? "missing" : "after"}
        beforeLabel="Before"
        afterLabel="After"
        label="Comparison split"
        split={split}
      />
    </PartScope>
  );
}

const colors: Record<string, string> = {
  before: "tomato",
  after: "skyblue",
  first: "slategray",
  next: "navy",
};
function photoSource(ref: string) {
  const color = colors[ref];
  if (!color) return;
  const drawing = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="45"><rect width="80" height="45" fill="${color}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(drawing)}#${ref}`;
}

function Fixture() {
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [next, setNext] = useState(false);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button onClick={() => setLoading(!loading)}>Loading</button>
      <button onClick={() => setMissing(!missing)}>Missing photo</button>
      <button onClick={() => setNext(!next)}>Next frame</button>
      <KitProvider theme={theme} resolvePhoto={photoSource} controller={controller} interactive>
        <PartScope screen="home" component="guide" rev={1} state="filled">
          {!loading && <KitAction part="now" label="Now" />}
          <KitTable
            columns={columns}
            rows={rows}
            corner={text("Channels")}
            activeColumn="5"
            timeline={{ jump: { part: "now", column: "5" } }}
            loading={loading}
          />
        </PartScope>
        <Compare loading={loading} missing={missing} />
        <PartScope screen="home" component="radar" rev={1} state={loading ? "loading" : "filled"}>
          <KitMapTile
            underlay={next ? "next" : "first"}
            pins={[{ id: "r1", label: "Storm", x: 1, y: 0, target: { part: "pin" } }]}
          />
        </PartScope>
        <DateSpanFixture />
      </KitProvider>
    </TamaguiProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
