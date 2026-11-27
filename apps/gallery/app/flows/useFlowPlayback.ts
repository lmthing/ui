import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fillFlow, flowScreenId, type FlowState, type FlowTemplateSource } from "@lmthing/ui/catalog";
import { createInteractionStore, type PhoneScreenProps } from "@lmthing/ui/kit";
import { captureReturn, restoreReturn, type FlowReturn } from "./flow-return";

type Example = FlowTemplateSource["examples"][number];
type RecordData = ReturnType<typeof fillFlow>["record"];

export function useFlowPlayback(
  template: FlowTemplateSource,
  { id: _id, names, record: seed, omit }: Example,
) {
  const [record, setRecord] = useState<RecordData>({ ...seed });
  const [index, setIndex] = useState(0);
  const [state, selectState] = useState<FlowState>();
  const [validationError, setValidationError] = useState(false);
  const [interaction] = useState(createInteractionStore);
  const history = useRef<FlowReturn[]>([]);
  const returnTo = useRef<FlowReturn | undefined>(undefined);
  const flow = useMemo(() => fillFlow(template, { names, record, omit }), [template, names, record, omit]);
  const frame = flow.frames[index]!;

  useLayoutEffect(() => {
    if (!returnTo.current) return;
    restoreReturn(returnTo.current);
    returnTo.current = undefined;
  }, [index, state]);

  function inspect(next: FlowState | undefined) {
    selectState(next);
  }
  function openStep(next: number) {
    history.current = [];
    setValidationError(false);
    setIndex(next);
    if (!state) selectState(flow.frames[next]!.states[0]);
  }
  function restart() {
    history.current = [];
    interaction.reset();
    setValidationError(false);
    setRecord({ ...seed });
    selectState(undefined);
    setIndex(0);
  }
  function move(next: number) {
    setValidationError(false);
    setIndex(next);
  }
  const onLink: NonNullable<PhoneScreenProps["onLink"]> = (goto, address) => {
    if (state) return;
    if (goto === "back") {
      returnTo.current = history.current.pop();
      if (returnTo.current) {
        interaction.reset(flowScreenId(index));
        move(returnTo.current.index);
      }
      return;
    }
    const next = flow.frames.findIndex((_, i) => flowScreenId(i) === goto);
    if (next < 0) return;
    const draft = draftFields(flowScreenId(index), frame.fields, record, interaction.get);
    if (Object.values(draft).includes("") && frame.states.includes("error")) {
      setValidationError(true);
      return;
    }
    if (Object.keys(draft).length) setRecord({ ...record, ...draft });
    history.current.push(captureReturn(index, address));
    move(next);
  };
  return { flow, frame, index, state, inspect, openStep, restart, interaction, validationError, onLink };
}

function draftFields(
  screen: string,
  fields: readonly string[],
  record: RecordData,
  get: (address: string) => unknown,
) {
  return Object.fromEntries(
    fields.flatMap((field, i) => {
      const value = get(`${screen}/field_${i + 1}/field`);
      return typeof value === "string" && typeof record[field] === "string" ? [[field, value.trim()]] : [];
    }),
  );
}
