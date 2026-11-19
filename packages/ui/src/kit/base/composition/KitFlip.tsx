import { Children, type ReactNode } from "react";
import { isWeb, YStack } from "tamagui";
import { component, space } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";

type Target = { item?: string; part: string | null };
type FlipProps = {
  part?: string | null;
  loading?: boolean;
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  label: string;
  target: Target;
  disabled?: boolean;
};

export function usePanelTarget(
  target: Target | undefined,
  label: string,
  loading: boolean,
  disabled: boolean,
) {
  const kit = useKit();
  const active = target?.part != null && !loading;
  const address = usePart(target?.part ?? "root", active);
  const press = () => kit.controller?.press(address.testID);
  if (!active) return {};
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    ...(isWeb ? { "aria-disabled": disabled } : { accessibilityState: { disabled } }),
    disabled,
    focusable: !disabled,
    ...(kit.interactive && kit.controller && !disabled
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
  };
}

export function PanelPlaceholder({ centered = false }: { centered?: boolean }) {
  const ks = useKitStyle();
  return (
    <YStack width="100%" gap={space.sm} alignItems={centered ? "center" : "flex-start"} aria-hidden>
      {["64%", "42%"].map((width) => (
        <YStack
          key={width}
          width={width}
          height={space.sm}
          borderRadius={shifted("sm", ks.radiusShift)}
          backgroundColor="$line"
        />
      ))}
    </YStack>
  );
}

function FlipFace({
  target,
  label,
  front,
  back,
  disabled = false,
  flipped,
  loading = false,
}: Omit<FlipProps, "part">) {
  const ks = useKitStyle();
  const { environment } = useKit();
  const interactive = usePanelTarget(target, label, loading, disabled);
  const settled = loading || environment.reduceMotion || environment.agentMode;
  const reveal = useAnimatedValue(Number(flipped), settled);
  const offset = settled ? 0 : Math.min(1, Math.abs(Number(flipped) - reveal));
  const face = flipped ? back : front;
  return (
    <YStack
      {...interactive}
      {...surfaceOf(ks.surface)}
      borderRadius={shifted("lg", ks.radiusShift)}
      minHeight={component.base.ringLg}
      padding={space.lg}
      alignItems="center"
      justifyContent="center"
      backgroundColor={disabled && !loading ? "$raised" : "$surface"}
    >
      {loading ? (
        <PanelPlaceholder centered />
      ) : Children.toArray(face).length === 0 ? (
        <PanelEmpty icon="sparkles" label={label} />
      ) : (
        <YStack
          width="100%"
          alignItems="center"
          gap={space.xs}
          y={offset * space.xs}
          opacity={1 - offset / 4}
        >
          {face}
        </YStack>
      )}
    </YStack>
  );
}

export function PanelEmpty({ icon, label }: { icon: "sparkles" | "ticket"; label: string }) {
  return (
    <YStack alignItems="center" gap={space.sm}>
      <KitIcon name={icon} scale="lg" decorative />
      <KitText tone="muted" align="center" part={null}>
        {label}
      </KitText>
    </YStack>
  );
}

/** Only the visible face mounts; the caller owns and changes the face. */
export function KitFlip({ part = "root", ...props }: FlipProps) {
  const context = usePartContext();
  const item = props.target.item ?? context.item;
  const same = !props.loading && props.target.part === part && item === context.item;
  const addressed = part !== null && !same;
  const address = usePart(part ?? "root", addressed);
  return (
    <YStack {...(addressed ? address : {})} aria-busy={props.loading || undefined}>
      <PartContext.Provider value={{ ...context, ...(item ? { item } : {}) }}>
        <FlipFace {...props} />
      </PartContext.Provider>
    </YStack>
  );
}
