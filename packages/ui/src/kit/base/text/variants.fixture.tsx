import React from "react";
import { createRoot } from "react-dom/client";
import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
import {
  KitListItem,
  KitProvider,
  KitStrip,
  KitText,
  PartScope,
  kitFonts,
  kitTokens,
  themeFor,
  useKit,
} from "@lmthing/ui/kit";

const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes: { kit_calm_light_moss: themeFor("kit_calm_light_moss") },
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
      <PartScope screen="preview" component="shelf" rev={1} state="filled">
        <KitListItem
          row={{ id: "r1", title: "Entry", photo: "lib:sample", value: "12" }}
          style="shelf"
          index={0}
          trail="value"
        />
      </PartScope>
    </KitProvider>
  </TamaguiProvider>,
);
