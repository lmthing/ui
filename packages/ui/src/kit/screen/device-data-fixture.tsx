import { startTransition, Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import {
  components,
  themeName,
  type Definition,
  type DeviceData,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { KitText, useDeviceData, useKit } from "@lmthing/ui/kit";
import { config } from "../../../../../apps/gallery";
import { PhoneScreen } from "./PhoneScreen";

const theme = { preset: "calm", accent: "moss", mode: "light" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "c1", c: "Fixture" }] };
const before = { readings: ["Before"] };
const after = { readings: ["After"] };
let release = () => {};
const gate = new Promise<void>((resolve) => {
  release = resolve;
});
const labelOf = (data?: DeviceData) => String(data?.readings?.[0] ?? "");
const defs = {
  Fixture: {
    ...components.Header,
    props: z.strictObject({}),
    meta: {
      ...components.Header.meta,
      id: "Fixture",
      deviceData: ["readings"],
      read: (_input, _state, _lang, data) => [labelOf(data)],
    },
  } satisfies Definition,
};

function Fixture() {
  const label = labelOf(useDeviceData());
  const { controller } = useKit();
  useLayoutEffect(() => {
    document.body.dataset.layoutRead = controller?.read() ?? "";
  }, [controller, label]);
  if (label === "After") {
    document.body.dataset.attempted = "true";
    use(gate);
  }
  return <KitText>{label}</KitText>;
}
const renderers = { Fixture };

function Scenario() {
  const [deviceData, setDeviceData] = useState(before);
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <button onClick={() => startTransition(() => setDeviceData(after))}>Update snapshot</button>
      <button onClick={() => release()}>Finish rendering</button>
      <Suspense fallback={null}>
        <PhoneScreen {...{ defs, renderers, screen, theme, deviceData }} />
      </Suspense>
    </TamaguiProvider>
  );
}

const target = document.createElement("div");
document.body.append(target);
createRoot(target).render(<Scenario />);
