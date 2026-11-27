import { XStack, YStack } from "tamagui";
import { KitProvider, KitText, PartScope, PhoneScreen, type PhoneScreenProps } from "@lmthing/ui/kit";
import {
  flowPreviewScreen,
  space,
  type FilledFlow,
  type FlowState,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { flowWords, readableId } from "./flow-copy";
import { flowHeight } from "./flow-height";

export const flowTheme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

const figure = /(?:\b\d{1,2}:\d{2}$)|(?:^[£$€]\d[\d,.]*$)/;

function primaryNumber(flow: FilledFlow, index: number, state?: FlowState) {
  if (state === "empty" || state === "error") return;
  const frame = flow.frames[index]!;
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

type FlowPhoneProps = Pick<PhoneScreenProps, "onLink" | "onChange"> & {
  flow: FilledFlow;
  index: number;
  state?: FlowState | undefined;
  incompleteCode?: boolean;
};

export function FlowPhone({ flow, index, state, incompleteCode, onLink, onChange }: FlowPhoneProps) {
  const screen = flowPreviewScreen(flow, index, state, {
    ...(incompleteCode ? { message: flowWords.codeLength } : {}),
    ...(!state ? { codeHint: flowWords.codeLength } : {}),
  });
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
      <YStack height={flowHeight(screen, flow.frames[index]!)}>
        <PhoneScreen
          key={`${screen.id}/${state ?? "play"}`}
          screen={screen}
          theme={flowTheme}
          onChange={onChange}
          onLink={onLink}
          interactive={!state}
          reduceMotion
        />
      </YStack>
    </YStack>
  );
}
