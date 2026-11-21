import React, { useState, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { createMemoryParts, KitBracket, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config } from "../render";

const parts = createMemoryParts();
declare global {
  interface Window {
    bracketParts: typeof parts.snapshot;
  }
}
window.bracketParts = parts.snapshot;

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type Rounds = ComponentProps<typeof KitBracket>["rounds"];
const rounds: Rounds = [
  {
    id: "semi",
    label: "Semifinals",
    ties: [
      { id: "r1", sides: [{ label: "A" }, { label: "B" }] },
      { id: "r2", sides: [{ label: "C" }, { label: "D" }] },
    ],
  },
  {
    id: "final",
    label: "Final",
    ties: [{ id: "r3", roundPart: "round", sides: [{ label: "A" }, { label: "C" }] }],
  },
];

function Fixture() {
  const [expanded, setExpanded] = useState(false);
  const first = rounds[0]!;
  const extra = { id: "r4", sides: [{ label: "E" }, { label: "F" }] } as const;
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button type="button" onClick={() => setExpanded(true)}>
        Add tie
      </button>
      <KitProvider theme={theme} parts={parts}>
        <PartScope screen="test" component="bracket" rev={1} state="filled">
          <KitBracket
            rounds={expanded ? [{ ...first, ties: [...first.ties, extra] }, rounds[1]!] : rounds}
            links={[]}
          />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
