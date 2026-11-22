import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import { config } from "../../../../../apps/gallery";
import { themeName, type Definition, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitAction, KitInput, KitSlider, useLocalAnchor, usePart } from "@lmthing/ui/kit";
import { PhoneScreen } from "../../../src/kit/screen";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const whole = { prop: "whole", integer: true, bounds: () => ({ min: 0.5, max: 4.5 }) } as const;
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
    parts: ["input", "slider", "cap", "anchor", "go", "whole", "whole_slider"],
    actions: {
      parts: {
        input: ["set"],
        slider: ["set"],
        cap: ["set"],
        go: ["press"],
        anchor: ["focus"],
        whole: ["set"],
        whole_slider: ["set"],
      },
    },
    drives: {
      commands: [{ scope: "component", part: "go", to: { self: true, part: "anchor" }, action: "focus" }],
    },
    set: {
      input: { prop: "value", bounds: (_, { cap }) => ({ min: 0.1, max: Number(cap), step: 0.1 }) },
      slider: { prop: "value", bounds: (_, { cap }) => ({ min: 0.1, max: Number(cap), step: 0.1 }) },
      cap: { prop: "cap" },
      whole,
      whole_slider: whole,
    },
  },
  props: z.strictObject({ value: z.number(), cap: z.number(), whole: z.int() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const screen = { id: "s", components: [{ id: "controls", c: "Controls", value: 0.1, cap: 0.3, whole: 1 }] };

function Controls() {
  const { ref, testID } = usePart("anchor");
  useLocalAnchor(testID, ref);
  return (
    <>
      <KitInput part="input" hint="Amount" kind="number" action="set" />
      <KitSlider part="slider" label="Amount slider" />
      <KitInput part="whole" hint="Whole amount" kind="number" action="set" />
      <KitSlider part="whole_slider" label="Whole slider" />
      <KitAction part="cap" label="Raise cap" action="set" value={0.5} />
      <KitAction part="go" label="Go to note" />
      <input aria-label="Note" ref={ref as never} />
    </>
  );
}

createRoot(document.body).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      defs={{ Controls: fixture }}
      renderers={{ Controls }}
      screen={screen}
      theme={theme}
      reduceMotion
    />
  </TamaguiProvider>,
);
