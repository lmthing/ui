import { Button, Text, XStack, YStack } from "tamagui";
import { publishBrowserAgent } from "@lmthing/ui/kit";
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
  const { flow, frame, index, state, inspect, openStep, restart, onChange, onLink } = useFlowPlayback(
    template,
    example,
  );
  const complete = !frame.forward.length;
  return (
    <YStack gap={space.sm} data-flow-player={frame.key} data-flow-state={state ?? "play"}>
      <XStack justifyContent="space-between" gap={space.sm} role="status">
        <Text color="$muted" fontSize="$caption">{`${flowWords.role}: ${readableId(frame.role)}`}</Text>
        {complete && (
          <Text color="$muted" fontSize="$caption">
            {flowWords.done}
          </Text>
        )}
      </XStack>
      <YStack
        backgroundColor="$bg"
        borderColor="$line"
        borderWidth={component.base.borderWidth}
        borderRadius={radius.lg}
        overflow="hidden"
        data-flow-phone
      >
        <FlowPhone {...{ flow, index, state, onChange, onLink }} onReady={publishBrowserAgent} />
      </YStack>
      {(state || complete) && (
        <XStack justifyContent="flex-end">
          <FlowControl active={false} onPress={state ? () => inspect(undefined) : restart}>
            {state ? flowWords.resume : flowWords.restart}
          </FlowControl>
        </XStack>
      )}
      <FlowInspector {...{ flow, index, state, openStep, inspect }} />
    </YStack>
  );
}
