import React from "react";
import { createRoot } from "react-dom/client";
import { components } from "@lmthing/ui/catalog";
import { PipelineFixture } from "./ApplicantPipeline.fixture";

const { ApplicantPipeline } = components;
createRoot(document.getElementById("root")!).render(
  <PipelineFixture input={ApplicantPipeline.examples[0]!} interactive />,
);
