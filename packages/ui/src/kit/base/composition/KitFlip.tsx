import { Children, type ReactNode } from "react";
import { isWeb, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
import { FlipPlaceholder, useHoldTarget } from "./flip";

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
  mode?: "press" | "hold";
  /** A start-aligned face and caption share KitContent's `md` inset. */
  align?: "center" | "start";
};

export function usePanelTarget(
  target: Target | undefined,
  label: string,
  loading: boolean,
  disabled: boolean,
  pressEnabled = true,
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
    ...(pressEnabled && kit.interactive && kit.controller && !disabled
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

function FlipHint({
  label,
  disabled,
  align,
}: {
  label: string;
  disabled: boolean;
  align: "center" | "start";
}) {
  return (
    <YStack
      marginTop={space.sm}
      opacity={disabled ? component.base.none : undefined}
      aria-hidden
      accessibilityElementsHidden
    >
      <KitText tone="accent" role="label" align={align} part={null}>
        {label}
      </KitText>
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
  align = "center",
  mode = "press",
}: Omit<FlipProps, "part">) {
  const ks = useKitStyle();
  const surface = surfaceOf(ks.surface);
  const { environment } = useKit();
  const hold = mode === "hold";
  const interactive: { testID?: string } = usePanelTarget(target, label, loading, disabled, !hold);
  const { held, handlers } = useHoldTarget(hold && !disabled ? interactive.testID : undefined);
  const visible = flipped && (!hold || held);
  const settled = hold || loading || environment.reduceMotion || environment.agentMode;
  const reveal = useAnimatedValue(Number(visible), settled);
  const offset = settled ? 0 : Math.min(1, Math.abs(Number(visible) - reveal));
  const face = visible ? back : front;
  const hint = target.part !== null;
  return (
    <YStack
      {...interactive}
      {...handlers}
      {...surface}
      borderRadius={shifted("md", ks.radiusShift)}
      minHeight={component.base.ringMd + space.md}
      padding={space.lg}
      {...(align === "start" ? { paddingHorizontal: space.md - surface.borderWidth } : {})}
      alignItems="center"
      justifyContent="center"
    >
      {loading ? (
        <FlipPlaceholder hint={hint} />
      ) : Children.toArray(face).length === 0 ? (
        <PanelEmpty icon="sparkles" label={label} />
      ) : (
        <YStack
          width="100%"
          alignItems={align === "start" ? "stretch" : "center"}
          gap={space.xs}
          y={offset * space.xs}
          opacity={disabled ? 1 - component.base.skeletonOpacity / 2 : 1 - offset / 4}
        >
          {face}
          {hint && <FlipHint {...{ label, disabled, align }} />}
        </YStack>
      )}
    </YStack>
  );
}

export function PanelEmpty({ icon, label }: { icon: "sparkles" | "ticket"; label: string }) {
  return (
    <YStack alignItems="center" gap={space.sm}>
      <YStack
        width={size.control.md}
        height={size.control.md}
        alignItems="center"
        justifyContent="center"
        borderRadius={radius.pill}
        backgroundColor="$raised"
        aria-hidden
      >
        <KitIcon name={icon} scale="md" decorative />
      </YStack>
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
