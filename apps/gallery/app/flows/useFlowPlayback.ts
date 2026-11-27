import { useMemo, useRef, useState } from "react";
import { fillFlow, flowScreenId, type FlowState, type FlowTemplateSource } from "@lmthing/ui/catalog";
import type { PhoneScreenProps } from "@lmthing/ui/kit";

type Example = FlowTemplateSource["examples"][number];
type RecordData = ReturnType<typeof fillFlow>["record"];

export function useFlowPlayback(
  template: FlowTemplateSource,
  { id: _id, names, record: seed, omit }: Example,
) {
  const [record, setRecord] = useState<RecordData>({ ...seed });
  const [index, setIndex] = useState(0);
  const [state, selectState] = useState<FlowState>();
  const draft = useRef<Record<string, string>>({});
  const flow = useMemo(() => fillFlow(template, { names, record, omit }), [template, names, record, omit]);
  const frame = flow.frames[index]!;

  function inspect(next: FlowState | undefined) {
    if (next === state) return;
    draft.current = {};
    selectState(next);
  }
  function openStep(next: number) {
    draft.current = {};
    setIndex(next);
    selectState(undefined);
  }
  function restart() {
    setRecord({ ...seed });
    openStep(0);
  }
  const onChange: NonNullable<PhoneScreenProps["onChange"]> = (screen, values) => {
    if (state) return;
    for (const [i, field] of frame.fields.entries()) {
      const value = values[`${screen.id}/field_${i + 1}/field`];
      if (typeof value === "string" && typeof record[field] === "string") draft.current[field] = value.trim();
    }
  };
  const onLink: NonNullable<PhoneScreenProps["onLink"]> = (goto) => {
    const next = flow.frames.findIndex((_, i) => flowScreenId(i) === goto);
    if (next < 0) return;
    if (!state && Object.values(draft.current).includes("") && frame.states.includes("error")) {
      inspect("error");
      return;
    }
    if (!state && Object.keys(draft.current).length) setRecord({ ...record, ...draft.current });
    openStep(next);
  };
  return { flow, frame, index, state, inspect, openStep, restart, onChange, onLink };
}
