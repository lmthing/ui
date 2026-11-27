import { useMemo } from "react";
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
import { useFlowSearch } from "./useFlowSearch";
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
  const search = useFlowSearch(inspection ? undefined : interaction, flowScreenId(index));
  const screen = useMemo(
    () => flowPreviewScreen(flow, index, state, { validationError, search }),
    [flow, index, state, validationError, search],
  );
  const number = primaryNumber(flow, index, state);
  return (
    <YStack>
      {number && (
        <KitProvider theme={flowTheme}>
          <XStack
            paddingHorizontal={space.lg}
            paddingVertical={space.md}
            gap={space.md}
            alignItems="center"
            justifyContent="space-between"
            data-flow-figure
          >
            <PartScope screen={screen.id} component="figure" rev={1} state="filled">
              <KitText part="label" role="label" tone="muted">
                {number.label}
              </KitText>
              <KitText part="value" role="number" tabular>
                {number.value}
              </KitText>
            </PartScope>
          </XStack>
        </KitProvider>
      )}
      <YStack height={flowHeight(screen)}>
        <PhoneScreen
          screen={screen}
          theme={flowTheme}
          onLink={onLink}
          onSend={onSend}
          resolvePhoto={resolvePhoto}
          interaction={inspection ? undefined : interaction}
          interactive={!inspection && !state && Boolean(onLink)}
          reduceMotion={inspection || !onLink ? true : undefined}
        />
      </YStack>
    </YStack>
  );
}
