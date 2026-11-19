import { YStack, XStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";

type DiceFaceProps = {
  part?: string;
  loading?: boolean;
  item: string;
  value?: number;
  held: boolean;
  label: string;
  disabled?: boolean;
  holdPart?: string;
} & ({ sides: 6; style?: "pips" | "numbers" } | { sides: 4 | 8 | 10 | 12 | 20; style: "numbers" });

function useHold(props: DiceFaceProps) {
  const kit = useKit();
  const address = usePart(props.holdPart ?? props.part ?? "root", !props.loading);
  const enabled = !props.loading && !props.disabled && !!props.holdPart;
  const toggle = () => kit.controller?.act({ address: address.testID, action: "toggle" });
  return {
    ...(props.loading ? { "aria-hidden": true } : address),
    ...(props.holdPart && !props.loading
      ? {
          accessibilityRole: "button" as const,
          accessibilityLabel: props.label,
          "aria-pressed": props.held,
          "aria-disabled": !!props.disabled,
          disabled: !!props.disabled,
          focusable: !props.disabled,
        }
      : { accessibilityLabel: props.loading ? undefined : props.label }),
    ...(enabled && kit.interactive && kit.controller
      ? {
          cursor: "pointer" as const,
          onPress: (event: { stopPropagation?(): void }) => {
            event.stopPropagation?.();
            return toggle();
          },
          onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              return toggle();
            }
          },
        }
      : {}),
  };
}

function Pips({ value }: { value: number }) {
  const dots: Record<number, readonly number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const face = dots[value]!;
  return (
    <YStack gap={space.sm} aria-hidden>
      {[0, 1, 2].map((row) => (
        <XStack key={row} gap={space.sm}>
          {[0, 1, 2].map((column) => (
            <YStack
              key={column}
              width={component.base.dot}
              height={component.base.dot}
              borderRadius={radius.pill}
              backgroundColor="$text"
              opacity={face.includes(row * 3 + column) ? 1 : component.base.none}
            />
          ))}
        </XStack>
      ))}
    </YStack>
  );
}

function FaceValue({ loading, value, sides, style }: DiceFaceProps) {
  if (loading || value === undefined || !Number.isInteger(value) || value < 1 || value > sides)
    return (
      <YStack
        width={loading ? size.icon.lg + space.md : size.icon.lg}
        height={loading ? space.sm : component.base.dot}
        borderRadius={radius.pill}
        backgroundColor="$line"
        aria-hidden
      />
    );
  if (sides === 6 && style !== "numbers") return <Pips value={value} />;
  return (
    <KitText role="number" numberScale="compact" emphasis="hero" align="center" part={null} tabular>
      {value}
    </KitText>
  );
}

function Face(props: DiceFaceProps) {
  const ks = useKitStyle();
  const target = useHold(props);
  const showHold = !props.loading && !!props.holdPart;
  const ownPart = props.part ?? "root";
  const separateFace = showHold && props.holdPart !== ownPart;
  const address = usePart(ownPart, separateFace);
  return (
    <YStack {...(separateFace ? address : {})}>
      <YStack
        {...(target as object)}
        width={size.control.md * 2}
        height={size.control.md * 2}
        padding={space.md}
        alignItems="center"
        justifyContent="center"
        borderRadius={shifted("lg", ks.radiusShift)}
        borderWidth={component.base.strongBorder}
        borderColor={props.loading ? "$line" : props.held ? "$accent" : "$muted"}
        backgroundColor={props.held && !props.loading ? "$accentSoft" : showHold ? "$raised" : "$surface"}
        aria-busy={!!props.loading}
        opacity={props.disabled && !props.loading ? component.base.disabledOpacity : 1}
      >
        <FaceValue {...props} />
        {showHold && (
          <YStack position="absolute" top={space.sm} alignSelf="center" pointerEvents="none" aria-hidden>
            <KitIcon name={props.held ? "lock" : "unlock"} scale="md" tone="text" decorative />
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}

/** Caller-owned outcome and hold state; no randomness or local game state. */
export function KitDiceFace(props: DiceFaceProps) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item: props.item }}>
      <Face {...props} />
    </PartContext.Provider>
  );
}
