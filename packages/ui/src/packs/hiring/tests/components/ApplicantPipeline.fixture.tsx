import React from "react";
import { TamaguiProvider } from "tamagui";
import type { StateName } from "@lmthing/ui/catalog";
import { PhoneScreen } from "../../../../../src/kit/screen";
import { config } from "../../../../../test/render";
import { ApplicantPipeline } from "../../components";

type Input = ReturnType<typeof ApplicantPipeline.fallback>;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = { ApplicantPipeline };
const renderers = { ApplicantPipeline: ApplicantPipeline.ApplicantPipeline };

export function pipelineScreen(input: Input, state: StateName = "filled") {
  return { id: "home", components: [{ ...input, id: "p1", c: "ApplicantPipeline", state }] };
}

// Exercise the real phone host even while the renderer is held out of the generated map.
export function PipelineFixture({
  input,
  state,
  interactive = false,
}: {
  input: Input;
  state?: StateName;
  interactive?: boolean;
}) {
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <PhoneScreen screen={pipelineScreen(input, state)} {...{ theme, defs, renderers, interactive }} />
    </TamaguiProvider>
  );
}
