import { Button, Text, XStack, YStack } from "tamagui";
import {
  component,
  radius,
  size,
  space,
  type FilledFlow,
  type FlowState,
  type FlowTemplateSource,
} from "@lmthing/ui/catalog";
import { flowWords, readableId } from "./flow-copy";
import { FlowPhone } from "./FlowPhone";
import { activateFlowControl } from "./flow-keyboard";
import { useFlowPlayback } from "./useFlowPlayback";

type StateControlProps = {
  active: boolean;
  children: string;
  onPress: () => void;
};

export function FlowControl({ active, children, onPress }: StateControlProps) {
  return (
    <Button
      aria-pressed={active}
      minHeight={size.control.md}
      paddingHorizontal={space.md}
      color="$text"
      backgroundColor={active ? "$accentSoft" : "$surface"}
      borderColor="$line"
      borderWidth={component.base.borderWidth}
      borderRadius={radius.md}
      onPress={onPress}
      fontSize="$label"
    >
      {children}
    </Button>
  );
}

type InspectorProps = {
  flow: FilledFlow;
  index: number;
  state: FlowState | undefined;
  openStep: (index: number) => void;
  inspect: (state: FlowState | undefined) => void;
};

function FlowInspector({ flow, index, state, openStep, inspect }: InspectorProps) {
  const frame = flow.frames[index]!;
  return (
    <YStack
      tag="details"
      gap={space.sm}
      padding={space.md}
      backgroundColor="$surface"
      borderRadius={radius.md}
    >
      <Text tag="summary" color="$text" fontSize="$label">
        {flowWords.inspect}
      </Text>
      <YStack gap={space.md} paddingTop={space.md}>
        <XStack gap={space.xs} flexWrap="wrap">
          {flow.frames.map((candidate, i) => (
            <FlowControl key={candidate.key} active={i === index} onPress={() => openStep(i)}>
              {candidate.title}
            </FlowControl>
          ))}
        </XStack>
        <Text color="$muted" fontSize="$caption">
          {flowWords.state}
        </Text>
        <XStack gap={space.xs} flexWrap="wrap">
          <FlowControl active={!state} onPress={() => inspect(undefined)}>
            {flowWords.play}
          </FlowControl>
          {frame.states.map((id) => (
            <FlowControl key={id} active={state === id} onPress={() => inspect(id)}>
              {flowWords.labels[id]}
            </FlowControl>
          ))}
        </XStack>
        <Text color="$muted" fontSize="$label">
          {frame.goal}
        </Text>
        {frame.do && (
          <Text color="$text" fontSize="$label">
            {frame.do}
          </Text>
        )}
      </YStack>
    </YStack>
  );
}

export function FlowPlayer({
  template,
  example,
}: {
  template: FlowTemplateSource;
  example: FlowTemplateSource["examples"][number];
}) {
  const playback = useFlowPlayback(template, example);
  const { flow, frame, index, state, inspection, inspect, openStep, restart, resume } = playback;
  const complete = !inspection && !frame.forward.length && !frame.back;
  return (
    <YStack
      gap={space.sm}
      data-flow-player={frame.key}
      data-flow-state={state ?? (inspection ? "inspect" : "play")}
    >
      <XStack justifyContent="space-between" gap={space.sm} role="status">
        <Text color="$muted" fontSize="$caption">{`${flowWords.role}: ${readableId(frame.role)}`}</Text>
        <Text color="$muted" fontSize="$caption">
          {inspection ? flowWords.readOnly : flowWords.simulation}
        </Text>
      </XStack>
      <YStack
        backgroundColor="$bg"
        borderColor="$line"
        borderWidth={component.base.borderWidth}
        borderRadius={radius.lg}
        overflow="hidden"
        data-flow-phone
        onKeyDown={inspection ? undefined : activateFlowControl}
      >
        <FlowPhone
          {...{ flow, index, state, inspection }}
          interaction={playback.interaction}
          validationError={playback.validationError}
          onLink={playback.onLink}
          onSend={playback.onSend}
        />
      </YStack>
      {(inspection || complete) && (
        <XStack justifyContent="flex-end">
          <FlowControl active={false} onPress={inspection ? resume : restart}>
            {inspection ? flowWords.resume : flowWords.restart}
          </FlowControl>
        </XStack>
      )}
      <FlowInspector {...{ flow, index, state, openStep, inspect }} />
    </YStack>
  );
}
