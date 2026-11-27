import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { PhoneScreen, publishBrowserAgent } from "@lmthing/ui/kit";
import type { ScreenLike, ThemeChoice } from "@lmthing/ui/catalog";
import { config } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = (id: string, title = id): ScreenLike => ({
  id,
  components: [
    { id: "note", c: "Field", label: `Note ${id}` },
    { id: "open", c: "Button", label: `Open ${title}`, goto: "next" },
  ],
});
const second = screen("second");
const preview = screen("preview");
const frame = { height: 225, display: "flex", flexDirection: "column" } as const;

function Fixture() {
  const [inert, setInert] = useState(false);
  const [showMain, setShowMain] = useState(true);
  const [showSecond, setShowSecond] = useState(true);
  const [publishMain, setPublishMain] = useState(false);
  const [publishSecond, setPublishSecond] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [readPreview, setReadPreview] = useState(false);
  const [revision, setRevision] = useState(0);
  const [links, setLinks] = useState<string[]>([]);
  const main = useMemo(() => screen("main", revision ? `main ${revision}` : "main"), [revision]);
  const onLink = (_goto: string, address: string) => setLinks((current) => [...current, address]);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button onClick={() => setInert(true)}>Mount preview</button>
      <button onClick={() => setPublishMain(true)}>Publish main</button>
      <button onClick={() => setPublishSecond(true)}>Publish second</button>
      <button onClick={() => setRevision((value) => value + 1)}>Update main</button>
      <button onClick={() => setReadOnly((current) => !current)}>Toggle read only</button>
      <button onClick={() => setReadPreview(true)}>Read preview</button>
      <button onClick={() => setShowMain(false)}>Dispose main</button>
      <button onClick={() => setShowSecond(false)}>Leave second route</button>
      <output>{links.join(",")}</output>
      {showMain && (
        <div style={frame}>
          <PhoneScreen
            screen={main}
            theme={theme}
            onLink={onLink}
            onReady={publishMain ? publishBrowserAgent : undefined}
          />
        </div>
      )}
      {showSecond && (
        <div style={frame}>
          <PhoneScreen
            screen={second}
            theme={theme}
            onLink={onLink}
            agentReadOnly={readOnly}
            onReady={publishSecond ? publishBrowserAgent : undefined}
          />
        </div>
      )}
      {inert && (
        <div style={frame}>
          <PhoneScreen
            screen={preview}
            theme={theme}
            interactive={false}
            agentReadOnly={readPreview}
            onReady={publishBrowserAgent}
            onLink={onLink}
          />
        </div>
      )}
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
