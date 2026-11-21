import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import { config } from "../../../../../apps/gallery";
import { themeName, type Definition, type ThemeChoice } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitInput,
  KitProvider,
  KitSlider,
  PartScope,
  useLocalAnchor,
  usePart,
} from "@lmthing/ui/kit";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const fixture: Definition = {
  meta: {
    id: "Controls",
    region: "body",
    group: "input",
    weight: 1,
    tier: "phone",
    purpose: "",
    pick: "",
    realPath: "",
    parts: ["input", "slider", "cap", "anchor", "go"],
    actions: { parts: { input: ["set"], slider: ["set"], cap: ["set"], go: ["press"], anchor: ["focus"] } },
    drives: {
      commands: [{ scope: "component", part: "go", to: { self: true, part: "anchor" }, action: "focus" }],
    },
    set: {
      input: { prop: "value", bounds: (_, { cap }) => ({ min: 0.1, max: Number(cap), step: 0.1 }) },
      slider: { prop: "value", bounds: (_, { cap }) => ({ min: 0.1, max: Number(cap), step: 0.1 }) },
      cap: { prop: "cap" },
    },
  },
  props: z.strictObject({ value: z.number(), cap: z.number() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const screen = { id: "s", components: [{ id: "controls", c: "Controls", value: 0.1, cap: 0.3 }] };
const controller = createScreenController({ screen, defs: { Controls: fixture } });

function Controls() {
  const { ref, testID } = usePart("anchor");
  useLocalAnchor(testID, ref);
  return (
    <>
      <KitInput part="input" hint="Amount" kind="number" action="set" />
      <KitSlider part="slider" label="Amount slider" />
      <button onClick={() => controller.act({ address: "s/controls/cap", action: "set", value: 0.5 })}>
        Raise cap
      </button>
      <button onClick={() => controller.press("s/controls/go")}>Go to note</button>
      <input aria-label="Note" ref={ref as never} />
    </>
  );
}

createRoot(document.body).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <KitProvider controller={controller} theme={theme} interactive>
      <PartScope screen={screen.id} component="controls" rev={1} state="filled">
        <Controls />
      </PartScope>
    </KitProvider>
  </TamaguiProvider>,
);
