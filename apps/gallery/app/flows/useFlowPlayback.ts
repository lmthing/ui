import { useState } from "react";
import type { FlowState } from "@lmthing/ui/catalog";
import { useFlowRun, type FlowExample } from "./useFlowRun";
import type { FlowTemplateSource } from "@lmthing/ui/catalog";

export function useFlowPlayback(template: FlowTemplateSource, example: FlowExample) {
  const [inspection, setInspection] = useState<{ index: number; state?: FlowState }>();
  const play = useFlowRun(template, example);
  const index = inspection?.index ?? play.index;
  return {
    ...play,
    frame: play.flow.frames[index]!,
    index,
    state: inspection?.state,
    inspection: Boolean(inspection),
    inspect: (state: FlowState | undefined) => setInspection({ index, ...(state ? { state } : {}) }),
    openStep: (next: number) => setInspection({ index: next }),
    resume: () => setInspection(undefined),
    validationError: !inspection && play.validationError,
  };
}
