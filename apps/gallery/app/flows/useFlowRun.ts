import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fillFlow, flowScreenId, type FilledFlow, type FlowTemplateSource } from "@lmthing/ui/catalog";
import { createInteractionStore, type InteractionStore, type PhoneScreenProps } from "@lmthing/ui/kit";
import { captureReturn, restoreReturn, type FlowReturn } from "./flow-return";
import { draftFields } from "./flow-draft";

export type FlowExample = FlowTemplateSource["examples"][number];
type RecordData = FilledFlow["record"];
type HistoryEntry = FlowReturn & { record: RecordData };

function useFlowHistory(index: number) {
  const entries = useRef<HistoryEntry[]>([]);
  const returnTo = useRef<FlowReturn | undefined>(undefined);
  useLayoutEffect(() => {
    if (!returnTo.current) return;
    restoreReturn(returnTo.current);
    returnTo.current = undefined;
  }, [index]);
  return {
    clear: () => {
      entries.current = [];
    },
    push: (address: string, record: RecordData) =>
      entries.current.push({ ...captureReturn(index, address), record }),
    pop: () => {
      const previous = entries.current.pop();
      returnTo.current = previous;
      return previous;
    },
  };
}

type Playback = {
  flow: FilledFlow;
  index: number;
  interaction: InteractionStore;
  history: ReturnType<typeof useFlowHistory>;
  setRecord: (record: RecordData) => void;
  move: (next: number) => void;
  showError: () => void;
  failOnce: () => boolean;
};

function connectLink({
  flow,
  index,
  interaction,
  history,
  setRecord,
  move,
  showError,
  failOnce,
}: Playback): NonNullable<PhoneScreenProps["onLink"]> {
  const screen = flowScreenId(index);
  const frame = flow.frames[index]!;
  return (goto, address) => {
    if (goto === "back") {
      const previous = history.pop();
      if (previous) {
        // Back within a numbered form moves between draft steps; it isn't a discard.
        const previousFrame = flow.frames[previous.index]!;
        if (!frame.progress || !previousFrame.progress || frame.role !== previousFrame.role)
          interaction.reset(screen);
        setRecord(previous.record);
        move(previous.index);
      }
      return;
    }
    const next = flow.frames.findIndex((_, i) => flowScreenId(i) === goto);
    if (next < 0) return;
    const draft = draftFields(screen, frame, flow.record, interaction.get);
    if ((Object.values(draft).includes("") && frame.states.includes("error")) || failOnce()) {
      showError();
      return;
    }
    if (Object.keys(draft).length) setRecord({ ...flow.record, ...draft });
    history.push(address, flow.record);
    move(next);
  };
}

function connectSend({
  flow,
  index,
  interaction,
  setRecord,
  move,
  showError,
  failOnce,
}: Playback): NonNullable<PhoneScreenProps["onSend"]> {
  const screen = flowScreenId(index);
  const frame = flow.frames[index]!;
  return (text, address) => {
    const thread = frame.thread;
    if (!thread?.compose || address !== `${screen}/composer/field`) return;
    if (failOnce()) {
      // Roll back the kit's local send echo: the simulated receiver did not take this draft.
      interaction.setMany({
        [address]: text,
        [`${screen}/composer/$sent`]: undefined,
        [`${screen}/thread/$messages`]: undefined,
      });
      showError();
      return;
    }
    const next = flow.frames.findIndex(({ key }) => key === frame.forward[0]?.target);
    if (next < 0) return;
    setRecord({ ...flow.record, [thread.compose]: text });
    move(next);
  };
}

export function useFlowRun(
  template: FlowTemplateSource,
  { id: _id, names, record: seed, omit }: FlowExample,
) {
  const [record, setRecord] = useState<RecordData>({ ...seed });
  const [index, setIndex] = useState(0);
  const [validationError, setValidationError] = useState(false);
  const [interaction] = useState(createInteractionStore);
  const attempted = useRef(new Set<string>());
  const history = useFlowHistory(index);
  const flow = useMemo(() => fillFlow(template, { names, record, omit }), [template, names, record, omit]);
  function failOnce() {
    const { retry, key } = flow.frames[index]!;
    if (!retry || record[retry] !== true || attempted.current.has(key)) return false;
    attempted.current.add(key);
    return true;
  }
  function move(next: number) {
    setValidationError(false);
    setIndex(next);
  }
  function restart() {
    history.clear();
    attempted.current.clear();
    interaction.reset();
    setRecord({ ...seed });
    move(0);
  }
  const playback = {
    flow,
    index,
    interaction,
    history,
    setRecord,
    move,
    failOnce,
    showError: () => setValidationError(true),
  };
  return {
    flow,
    index,
    validationError,
    interaction,
    restart,
    onLink: connectLink(playback),
    onSend: connectSend(playback),
  };
}
