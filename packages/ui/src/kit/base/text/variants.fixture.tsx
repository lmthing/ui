import React from "react";
import { createRoot } from "react-dom/client";
import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
import {
  KitProvider,
  KitStrip,
  KitText,
  PartScope,
  kitFonts,
  kitThemes,
  kitTokens,
  useKit,
} from "@lmthing/ui/kit";

const roles = kitThemes.kit_calm_light_moss;
const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes: { kit_calm_light_moss: { ...roles, color: roles.text, background: roles.bg } },
});

function Preference() {
  return <output>{useKit().motion}</output>;
}

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <KitProvider theme={{ preset: "calm", mode: "light", accent: "moss", motion: "lively" }}>
      <PartScope screen="preview" component="strip" rev={1} state="filled">
        <Preference />
        <KitStrip overflow="page">
          <KitText part="first">First</KitText>
          <KitText part="second">Second</KitText>
          <KitText part="third">Third</KitText>
        </KitStrip>
      </PartScope>
    </KitProvider>
  </TamaguiProvider>,
);
