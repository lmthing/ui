import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider, YStack } from "tamagui";
import { z } from "zod";
import type { Definition } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitAction,
  KitCodeBlock,
  KitMasonry,
  KitPanelStrip,
  KitProvider,
  KitText,
  PartScope,
} from "@lmthing/ui/kit";
import { config } from "../../render";

const theme = { preset: "calm", mode: "light", accent: "moss", motion: "lively" } as const;
const definition = {
  props: z.strictObject({}),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const meta = {
  group: "content",
  region: "body",
  weight: 1,
  tier: "phone",
  purpose: "Exercise kit drawing",
  pick: "Use the fixture drawing",
  realPath: "Local fixture",
} as const;
const defs = {
  Source: {
    ...definition,
    meta: { ...meta, id: "Source", parts: ["root"], actions: { parts: { root: ["copy"] } } },
  },
  Reader: {
    ...definition,
    meta: { ...meta, id: "Reader", parts: ["root", "hud"], actions: { parts: { hud: ["toggle"] } } },
  },
} satisfies Record<string, Definition>;

const source = `  const label = "<em>literal</em>";\n\n\t// trailing whitespace  \n${"long_identifier_".repeat(14)}\n`;
const ratios = [0.75, 2, 1, 2];
const cards = ratios.map((ratio, i) => ({
  id: `r${i + 1}`,
  ratio,
  children: (
    <YStack height="100%" backgroundColor={i % 2 ? "$accentSoft" : "$raised"}>
      <KitText>{`Tile ${i + 1}`}</KitText>
    </YStack>
  ),
}));
const panels = [1, 2, 0.5].map((ratio, i) => ({
  id: `r${i + 1}`,
  ratio,
  content: (
    <YStack height="100%" backgroundColor={i % 2 ? "$accentSoft" : "$raised"}>
      <KitText>{`Panel ${i + 1}`}</KitText>
      {i === 0 && <KitAction label="Panel link" part="link" />}
    </YStack>
  ),
}));

function SourceFixture({ loading, empty }: { loading: boolean; empty: boolean }) {
  const [wrap, setWrap] = useState(false);
  const [changed, setChanged] = useState(false);
  return (
    <PartScope screen="home" component="code" rev={1} state="filled">
      <button onClick={() => setWrap(!wrap)}>Wrap</button>
      <button onClick={() => setChanged(!changed)}>Change code</button>
      <KitCodeBlock
        code={empty ? "" : changed ? "1 + 1 = 2" : source}
        language={changed ? "Math" : "TypeScript"}
        label="Example"
        wrap={wrap}
        loading={loading}
        copyTarget={{ part: "root" }}
      />
    </PartScope>
  );
}

function ReaderFixture({ loading, empty, hud }: { loading: boolean; empty: boolean; hud: boolean }) {
  const [mode, setMode] = useState<"strip" | "ltr" | "rtl">("strip");
  const [current, setCurrent] = useState(0);
  const [hasTarget, setHasTarget] = useState(true);
  return (
    <PartScope screen="home" component="panels" rev={1} state="filled">
      {(["strip", "ltr", "rtl"] as const).map((value) => (
        <button key={value} onClick={() => setMode(value)}>
          {value}
        </button>
      ))}
      <button onClick={() => setCurrent(current === 2 ? 0 : 2)}>Jump</button>
      <button onClick={() => setHasTarget(!hasTarget)}>Change target</button>
      {hud && <KitText part={null}>Reader HUD</KitText>}
      <KitPanelStrip
        mode={mode}
        panels={empty ? [] : panels}
        current={current}
        loading={loading}
        {...(hasTarget ? { target: { part: "hud" } } : {})}
      />
    </PartScope>
  );
}

function Fixture() {
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [single, setSingle] = useState(false);
  const [hud, setHud] = useState(true);
  const [copied, setCopied] = useState("");
  const [attempted, setAttempted] = useState("");
  const controller = useMemo(
    () =>
      createScreenController({
        defs,
        requireMounted: true,
        screen: {
          id: "home",
          components: [
            { id: "code", c: "Source" },
            { id: "panels", c: "Reader" },
          ],
        },
        writeClipboard: (text) => setCopied(text),
        resolveClipboardText: () => "Host fallback",
        onAction: ({ address, action }) => {
          if (address === "home/panels/hud" && action === "toggle") setHud((shown) => !shown);
        },
      }),
    [],
  );
  useEffect(() => () => controller.dispose(), [controller]);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button onClick={() => setLoading(!loading)}>Loading</button>
      <button onClick={() => setEmpty(!empty)}>Empty</button>
      <button onClick={() => setSingle(!single)}>Single</button>
      <button
        onClick={() => setAttempted(String(controller.act({ address: "home/code/root", action: "copy" }).ok))}
      >
        Attempt copy
      </button>
      <output hidden id="clipboard">
        {copied}
      </output>
      <output hidden id="attempted">
        {attempted}
      </output>
      <KitProvider theme={theme} interactive controller={controller}>
        <SourceFixture {...{ loading, empty }} />
        <PartScope screen="home" component="tiles" rev={1} state="filled">
          <KitMasonry loading={loading} items={empty ? [] : single ? cards.slice(0, 1) : cards} />
        </PartScope>
        <ReaderFixture {...{ loading, empty, hud }} />
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
