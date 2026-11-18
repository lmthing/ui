import { YStack, XStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

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

function Pips({ value, loading }: { value: number | undefined; loading: boolean | undefined }) {
  const dots: Record<number, readonly number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
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
              backgroundColor={loading ? "$line" : "$text"}
              opacity={loading || dots[value ?? 0]?.includes(row * 3 + column) ? 1 : component.base.none}
            />
          ))}
        </XStack>
      ))}
    </YStack>
  );
}

function Face(props: DiceFaceProps) {
  const ks = useKitStyle();
  const target = useHold(props);
  const address = usePart(
    props.part ?? "root",
    !props.loading && !!props.holdPart && props.holdPart !== (props.part ?? "root"),
  );
  const valid =
    props.value !== undefined &&
    Number.isInteger(props.value) &&
    props.value >= 1 &&
    props.value <= props.sides;
  const pips = props.sides === 6 && props.style !== "numbers";
  return (
    <YStack
      {...(!props.loading && props.holdPart && props.holdPart !== (props.part ?? "root") ? address : {})}
    >
      <YStack
        {...(target as object)}
        width={size.control.md * 2}
        height={size.control.md * 2}
        padding={space.md}
        alignItems="center"
        justifyContent="center"
        borderRadius={shifted("lg", ks.radiusShift)}
        borderWidth={component.base.strongBorder}
        borderColor={props.held && !props.loading ? "$accent" : "$muted"}
        backgroundColor={props.held && !props.loading ? "$accentSoft" : "$surface"}
        aria-busy={!!props.loading}
      >
        {pips && (valid || props.loading) ? (
          <Pips value={props.value} loading={props.loading} />
        ) : props.loading || !valid ? (
          <YStack
            width={size.icon.lg}
            height={component.base.dot}
            borderRadius={radius.pill}
            backgroundColor="$line"
            aria-hidden
          />
        ) : (
          <KitText role="number" align="center" part={null} tabular>
            {props.value}
          </KitText>
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
