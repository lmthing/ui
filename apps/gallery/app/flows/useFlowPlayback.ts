import { useState } from "react";
import type { FlowState, FlowTemplateSource } from "@lmthing/ui/catalog";
import { useFlowRun, type FlowExample } from "./useFlowRun";

export function useFlowPlayback(template: FlowTemplateSource, example: FlowExample) {
  const [inspection, setInspection] = useState<{ index: number; state?: FlowState; incompleteCode?: true }>();
  const play = useFlowRun(template, example);
  const index = inspection?.index ?? play.index;
  return {
    ...play,
    frame: play.flow.frames[index]!,
    index,
    state: inspection?.state,
    inspection: Boolean(inspection),
    incompleteCode: inspection?.incompleteCode === true,
    showCodeError: () => setInspection({ index, state: "error", incompleteCode: true }),
    inspect: (state: FlowState | undefined) => setInspection({ index, ...(state ? { state } : {}) }),
    openStep: (next: number) => setInspection({ index: next }),
    resume: () => setInspection(undefined),
    restart: () => {
      setInspection(undefined);
      play.restart();
    },
    validationError: !inspection && play.validationError,
  };
}
