import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import {
  KitAction,
  KitNumberPad,
  PhoneScreen,
  usePrivateStatus,
  type PrivateValuesHost,
} from "@lmthing/ui/kit";
import { config } from "../../render";
import { copy, defs, fixturePin, screen, verify } from "./private-values.fixture";

const privateValues: PrivateValuesHost = {
  copy: { [copy.address]: () => "approved" },
  verify: { [verify.address]: (candidate) => (candidate === fixturePin ? "approved" : "denied") },
};
const keys = [
  { id: "r2", label: "0", value: { append: "0" } },
  { id: "r3", label: "2", sublabel: "ABC", value: { append: "2" } },
  { id: "r4", label: "Erase", value: { backspace: true as const } },
];

function PrivateFixture() {
  const status = usePrivateStatus("verify", "verify");
  return (
    <>
      <KitNumberPad label="Private input" value="" keys={keys} displayPart="value" target={{ part: "pad" }} />
      <KitAction part="verify" action="press" label="Verify input" />
      <KitAction part="copy" action="copy" hostCopy label="Copy protected value" copiedLabel="Copied" />
      <output>{status}</output>
    </>
  );
}

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const renderers = { PrivateFixture };
createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      {...{ defs, screen, theme, renderers, privateValues }}
      authenticateReveal={async () => "approved"}
    />
  </TamaguiProvider>,
);
