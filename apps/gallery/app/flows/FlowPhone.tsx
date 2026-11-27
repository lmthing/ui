import { useLayoutEffect, useMemo } from "react";
import { XStack, YStack } from "tamagui";
import { KitProvider, KitText, PartScope, PhoneScreen, type PhoneScreenProps } from "@lmthing/ui/kit";
import {
  flowPreviewScreen,
  flowScreenId,
  space,
  type FilledFlow,
  type FlowState,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { flowWords, readableId } from "./flow-copy";
import { flowHeight } from "./flow-height";
import { emptySearchStore, useFlowSearch } from "./useFlowSearch";
import { keepReceiptAnchor } from "./flow-screen";
import { focusFlowPart } from "./flow-return";
import { resolvePhoto } from "../../index";

export const flowTheme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

const figure = /(?:\b\d{1,2}:\d{2}$)|(?:^[£$€]\d[\d,.]*$)/;

function primaryNumber(flow: FilledFlow, index: number, state?: FlowState) {
  if (state === "empty" || state === "error") return;
  const frame = flow.frames[index]!;
  if (frame.back) return;
  const visible = Object.entries(flow.record).find(
    ([field, value]) =>
      typeof value === "string" &&
      figure.test(value) &&
      (frame.fields.includes(field) || frame.see.includes(value)),
  );
  if (!visible) return;
  const [field, raw] = visible as [string, string];
  const label = Object.hasOwn(flowWords.figures, field) ? flowWords.figures[field]! : readableId(field);
  return { label, value: raw.match(figure)![0] };
}

function FlowFigure({ screen, label, value }: { screen: string; label: string; value: string }) {
  return (
    <KitProvider theme={flowTheme}>
      <XStack
        paddingHorizontal={space.lg}
        paddingVertical={space.md}
        gap={space.md}
        alignItems="center"
        justifyContent="space-between"
        data-flow-figure
      >
        <PartScope screen={screen} component="figure" rev={1} state="filled">
          <KitText part="label" role="label" tone="muted">
            {label}
          </KitText>
          <KitText part="value" role="number" tabular>
            {value}
          </KitText>
        </PartScope>
      </XStack>
    </KitProvider>
  );
}

type FlowPhoneProps = Pick<PhoneScreenProps, "onLink" | "onSend" | "interaction"> & {
  flow: FilledFlow;
  index: number;
  state?: FlowState | undefined;
  validationError?: boolean;
  inspection?: boolean;
};

export function FlowPhone({
  flow,
  index,
  state,
  onLink,
  onSend,
  interaction,
  validationError = false,
  inspection = false,
}: FlowPhoneProps) {
  const fixture = useMemo(
    () => (state === "empty" ? emptySearchStore(flow, index) : undefined),
    [state, flow, index],
  );
  const store = fixture ?? (inspection ? undefined : interaction);
  const search = useFlowSearch(store, flowScreenId(index));
  const screen = useMemo(() => {
    const preview = flowPreviewScreen(flow, index, state, { validationError, search });
    return !inspection && onLink ? keepReceiptAnchor(flow, index, preview) : preview;
  }, [flow, index, state, validationError, search, inspection, Boolean(onLink)]);
  const nextFocus =
    screen.id !== flowScreenId(index)
      ? "action_1/root"
      : !inspection && onLink && index > 0 && flow.frames[index]?.actionList
        ? "choices/r1/root"
        : undefined;
  useLayoutEffect(() => {
    if (nextFocus) focusFlowPart(`${screen.id}/${nextFocus}`);
  }, [screen.id, nextFocus]);
  const number = primaryNumber(flow, index, state);
  return (
    <YStack>
      {number && <FlowFigure screen={screen.id} {...number} />}
      <YStack height={flowHeight(screen)}>
        <PhoneScreen
          screen={screen}
          theme={flowTheme}
          onLink={onLink}
          onSend={onSend}
          resolvePhoto={resolvePhoto}
          interaction={store}
          interactive={!inspection && !state && Boolean(onLink)}
          reduceMotion={inspection || !onLink ? true : undefined}
        />
      </YStack>
    </YStack>
  );
}
