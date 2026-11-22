import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components } from "@lmthing/ui/catalog";
import { PhoneScreen } from "../../../../../src/kit/screen";
import { config } from "../../../../../test/render";
import { Candidate, Interview, JobPost } from "../../components";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = { Candidate, Interview, JobPost };
const renderers = {
  Candidate: Candidate.Candidate,
  Interview: Interview.Interview,
  JobPost: JobPost.JobPost,
};
const scenario = new URLSearchParams(window.location.search);
const example = scenario.has("default") ? 0 : 2;
const screen = {
  id: "home",
  components: [
    { ...components.Candidate.examples[example]!, c: "Candidate", id: "c1" },
    {
      ...components.Interview.examples[example]!,
      ...(scenario.has("closed") && { status: "cancelled" }),
      c: "Interview",
      id: "i1",
    },
    {
      ...components.JobPost.examples[example]!,
      ...(scenario.has("closed") && { closes: "2020-01-01" }),
      c: "JobPost",
      id: "j1",
    },
  ],
};

function HiringOptionsFixture() {
  const [destination, setDestination] = useState("");
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <PhoneScreen {...{ theme, screen, defs, renderers }} interactive onLink={setDestination} />
      <output data-testid="destination">{destination}</output>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<HiringOptionsFixture />);
