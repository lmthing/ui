import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import type { Definition } from "@lmthing/ui/catalog";
import {
  KitAction,
  KitText,
  PhoneScreen,
  useHostOperations,
  type HostCommandAdapter,
} from "../../../src/kit";
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
      actions: { parts: { root: ["press"] } },
      hostCommands: { parts: { "root.press": { kind: "external", uri: () => "https://example.test" } } },
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
const hostCommands: HostCommandAdapter = {
  external: {
    allows: () => true,
    run: (_request, { source }) => ({
      status: source === "human" && navigator.userActivation.isActive ? "accepted" : "rejected",
    }),
  },
};
function HandoffFixture() {
  const [operation] = useHostOperations();
  return (
    <>
      <KitAction label="Open source" />
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
createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      defs={defs}
      renderers={{ HandoffFixture, LoadFixture }}
      screen={{
        id: "home",
        components: [
          { id: "link", c: "HandoffFixture" },
          { id: "loader", c: "LoadFixture", state: "loading" },
        ],
      }}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      hostCommands={hostCommands}
    />
  </TamaguiProvider>,
);
