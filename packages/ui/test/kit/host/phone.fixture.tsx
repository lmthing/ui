import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import type { Definition, ScreenLike } from "@lmthing/ui/catalog";
import { KitAction, KitText, PhoneScreen, useHostOperations } from "../../../src/kit";
import { config } from "../../render";

const frame = {
  group: "action",
  purpose: "Test a host action.",
  pick: "Test a host action.",
  region: "body",
  weight: 1,
  tier: "ok",
  realPath: "Hand off a host action.",
} as const;
const base = { props: z.strictObject({}), fallback: () => ({}), examples: [], probes: [] };
const defs = {
  HandoffFixture: {
    ...base,
    meta: {
      ...frame,
      id: "HandoffFixture",
      actions: { parts: { root: ["press"], blocked: ["press"] } },
      hostCommands: {
        parts: {
          "root.press": { kind: "external", uri: () => "https://example.test" },
          "blocked.press": { kind: "external", uri: () => "https://example.test" },
        },
      },
    },
  },
  LoadFixture: {
    ...base,
    meta: {
      ...frame,
      id: "LoadFixture",
      actions: { parts: { root: ["press"], another: ["press"] } },
      loadingActions: ["root.press"],
    },
  },
} satisfies Record<string, Definition>;
function HandoffFixture() {
  const [operation] = useHostOperations();
  return (
    <>
      <KitAction label="Open source" />
      <KitAction label="Blocked source" part="blocked" disabled />
      {operation && <KitText>{`Handoff ${operation.status}`}</KitText>}
    </>
  );
}
function LoadFixture() {
  return (
    <>
      <KitAction label="Refresh" />
      <KitAction label="Unavailable" part="another" />
    </>
  );
}
const screen: ScreenLike = {
  id: "home",
  components: [
    { id: "link", c: "HandoffFixture" },
    { id: "loader", c: "LoadFixture", state: "loading" },
  ],
};
const renderers = { HandoffFixture, LoadFixture };
function Fixture() {
  const [finish, setFinish] = useState<() => void>();
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button type="button" disabled={!finish} onClick={finish}>
        Finish handoff
      </button>
      <PhoneScreen
        defs={defs}
        renderers={renderers}
        screen={screen}
        theme={{ preset: "calm", mode: "light", accent: "moss" }}
        hostCommands={{
          external: {
            allows: () => true,
            run: (_request, { signal, source }) => {
              if (source !== "human" || !navigator.userActivation.isActive) return { status: "rejected" };
              return new Promise((resolve) =>
                setFinish(() => () => resolve({ status: signal.aborted ? "rejected" : "accepted" })),
              );
            },
          },
        }}
      />
    </TamaguiProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
