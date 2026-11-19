import type { ReactNode } from "react";
import { YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";

type BreathProps = {
  part?: string | null;
  loading?: boolean;
  progress: number;
  phase: "inhale" | "hold" | "exhale" | "rest";
  label: string;
  children: ReactNode;
  paused?: boolean;
  target: { item?: string; part: string | null };
};

function useBreathTarget({ target, loading, label }: BreathProps) {
  const kit = useKit();
  const active = target.part !== null && !loading;
  const address = usePart(target.part ?? "root", active);
  const press = () => kit.controller?.press(address.testID);
  return active
    ? {
        ...address,
        accessibilityRole: "button" as const,
        accessibilityLabel: label,
        focusable: true,
        ...(kit.interactive && kit.controller
          ? {
              cursor: "pointer" as const,
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                return press();
              },
              onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                return press();
              },
            }
          : {}),
      }
    : {};
}

export function breathRatio(phase: BreathProps["phase"], progress: number) {
  const ratio = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (phase === "hold") return 1;
  if (phase === "exhale") return 1 - ratio;
  return phase === "inhale" ? ratio : 0;
}

const box = component.base.ringLg + space.lg * 2;
const minimum = component.base.ringMd + space.md;

function BreathCircle(props: BreathProps) {
  const { environment } = useKit();
  const ks = useKitStyle();
  const target = useBreathTarget(props);
  const resting = props.phase === "rest" || props.paused;
  const ratio = breathRatio(props.phase, props.progress);
  const settled = Boolean(props.loading || props.paused || environment.reduceMotion || environment.agentMode);
  const animated = useAnimatedValue(ratio, settled);
  const diameter =
    minimum + (box - minimum) * (props.loading ? 1 : settled ? ratio : Math.max(0, Math.min(1, animated)));
  return (
    <YStack
      {...target}
      width={box}
      maxWidth="100%"
      height={box}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
    >
      <YStack
        position="absolute"
        width={diameter}
        height={diameter}
        maxWidth="100%"
        borderRadius={radius.pill}
        borderWidth={component.base.borderWidth}
        borderColor={resting || props.loading ? "$line" : "$accent"}
        backgroundColor={resting || props.loading ? "$raised" : "$accentSoft"}
        pointerEvents="none"
        aria-hidden
      />
      <YStack maxWidth={minimum - space.lg} alignItems="center" gap={space.xs}>
        {props.loading
          ? [2, 3].map((divisor) => (
              <YStack
                key={divisor}
                width={component.base.ringMd / divisor}
                height={space.sm}
                backgroundColor="$line"
                borderRadius={shifted("sm", ks.radiusShift)}
                aria-hidden
              />
            ))
          : (props.children ?? (
              <>
                <KitIcon name="dot" scale="lg" decorative />
                <KitText part={null} tone="muted" align="center">
                  {props.label}
                </KitText>
              </>
            ))}
      </YStack>
    </YStack>
  );
}

/** Draws the supplied phase; the caller owns time, text and start/stop state. */
export function KitBreath({ part = "root", ...props }: BreathProps) {
  const context = usePartContext();
  const item = props.target.item ?? context.item;
  const addressed = part !== null && (props.loading || part !== props.target.part || item !== context.item);
  const address = usePart(part ?? "root", addressed);
  return (
    <YStack {...(addressed ? address : {})} aria-busy={props.loading || undefined}>
      <PartContext.Provider value={{ ...context, ...(item ? { item } : {}) }}>
        <BreathCircle {...props} />
      </PartContext.Provider>
    </YStack>
  );
}
