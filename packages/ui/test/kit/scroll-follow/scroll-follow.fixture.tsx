import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider, XStack, YStack } from "tamagui";
import { KitProvider, KitRow, KitScroll, KitText, PartScope } from "@lmthing/ui/kit";
import { component } from "@lmthing/ui/catalog";
import { config } from "../../render";

const theme = { preset: "calm", mode: "light", accent: "moss", motion: "lively" } as const;
const rows = Array.from({ length: 20 }, (_, index) => index + 1);
const horizontal = new URLSearchParams(location.search).has("horizontal");
const Stack = horizontal ? XStack : YStack;

function Fixture() {
  const [row, setRow] = useState(1);
  const [enabled, setEnabled] = useState(true);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button type="button">Keep focus here</button>
      <button type="button" onClick={() => setEnabled(!enabled)} aria-pressed={enabled}>
        Follow
      </button>
      {[1, 2, 14, 16, 18, 19, 21].map((number) => (
        <button type="button" key={number} onClick={() => setRow(number)}>
          Show {number}
        </button>
      ))}
      <output>{row}</output>
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          <KitScroll
            label="Addressed rows"
            axis={horizontal ? "horizontal" : "vertical"}
            follow={{ address: `home/c1/r${row}/root`, enabled }}
          >
            <Stack>
              {rows.map((number) => (
                <YStack key={number} width={horizontal ? component.base.emptyMinHeight : undefined}>
                  <KitRow item={`r${number}`} role="button" label={`Row ${number}`} selected={row === number}>
                    <KitText part={null}>Row {number}</KitText>
                  </KitRow>
                </YStack>
              ))}
            </Stack>
          </KitScroll>
        </PartScope>
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
