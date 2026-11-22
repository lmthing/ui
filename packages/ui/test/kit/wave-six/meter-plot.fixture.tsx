import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import type { Definition } from "@lmthing/ui/catalog";
import {
  createMemoryParts,
  createScreenController,
  KitLinePlot,
  KitMeter,
  KitProvider,
  PartScope,
} from "@lmthing/ui/kit";
import { config } from "../../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = createMemoryParts();
const events: { address: string; action: string; value: unknown }[] = [];
declare global {
  interface Window {
    meterPlotParts: typeof parts.snapshot;
    meterPlotEvents: typeof events;
  }
}
window.meterPlotParts = parts.snapshot;
window.meterPlotEvents = events;

const points = [0, 4, 12, 30, 60, 90].map((x, index) => ({
  id: `r${index + 1}`,
  x,
  label: `${x}:00`,
  value: 55 + index ** 2,
}));
const definition = {
  meta: {
    id: "PlotFixture",
    purpose: "Show numeric readings.",
    pick: "Inspect a reading on a line plot.",
    realPath: "Local test fixture.",
    group: "data",
    region: "body",
    tier: "phone",
    weight: 1,
    parts: ["first"],
    items: { key: "points", parts: ["root"] },
    actions: { parts: { first: ["select"] }, items: { root: ["select"] } },
  },
  props: z.strictObject({ points: z.array(z.object({ label: z.string() })) }),
  fallback: () => ({ points: [] }),
  examples: [],
  probes: [],
} satisfies Definition;
const controller = createScreenController({
  defs: { PlotFixture: definition },
  screen: { id: "test", components: [{ c: "PlotFixture", id: "plot", points }] },
  onAction: ({ address, action, value }) => events.push({ address, action, value }),
  requireMounted: true,
});

function Meters() {
  return ["ltr", "rtl"].map((dir) => (
    <div key={dir} dir={dir}>
      <div data-testid={`${dir}-default`}>
        <KitMeter label="Value" amount="30" ratio={0.3} addressed={false} />
      </div>
      <div data-testid={`${dir}-end`}>
        <KitMeter label="Value" amount="30" ratio={0.3} fillFrom="end" addressed={false} />
      </div>
    </div>
  ));
}

function Fixture() {
  const [loading, setLoading] = useState(false);
  const [moved, setMoved] = useState(false);
  const [selected, setSelected] = useState("r2");
  useEffect(() => () => controller.dispose(), []);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <KitProvider theme={theme} parts={parts} controller={controller} interactive>
        <PartScope screen="test" component="meters" rev={1} state="filled">
          <Meters />
        </PartScope>
        <PartScope screen="test" component="plot" rev={1} state="filled">
          <KitLinePlot
            series={[
              {
                id: "one",
                label: "Reading",
                points: moved ? [{ ...points[0]!, value: 70 }, ...points.slice(1)] : points,
              },
            ]}
            center={50}
            baseline={50}
            loading={loading}
            selected={selected}
            targetPlacement="marker"
            targets={[
              { point: "r1", target: { part: "first" } },
              { point: "r2", target: { item: "r2", part: "root" } },
              { point: "r6", target: { item: "r6", part: "root" } },
            ]}
          />
        </PartScope>
        <button
          type="button"
          onClick={() => {
            setMoved(true);
            setSelected("r1");
          }}
        >
          Move first marker
        </button>
        <button type="button" onClick={() => setLoading(!loading)}>
          Toggle loading
        </button>
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
