import { useState } from "react";
import { useAnimatedValue } from "../../motion";
import { motion } from "../../../catalog";
import { XStack, styled, isWeb } from "tamagui";
import {
  component,
  radius,
  size,
  space,
  type as typography,
  type IconName,
  type ActionName,
} from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { useComponentState, usePart } from "../../part";
import { KitIcon, KitText, shifted, type IconTone, type TextTone } from "../text";

export type ActionKind = "primary" | "secondary" | "quiet" | "danger";
const Frame = styled(XStack, {
  alignItems: "center",
  justifyContent: "center",
  minHeight: size.control.md,
  minWidth: size.control.md,
  gap: space.sm,
  variants: {
    kind: {
      primary: { backgroundColor: "$accent" },
      secondary: { backgroundColor: "$accentSoft" },
      quiet: { backgroundColor: "transparent" },
      danger: {
        backgroundColor: "transparent",
        borderColor: "$bad",
        borderWidth: component.base.borderWidth,
      },
    },
    iconOnly: { true: { paddingHorizontal: space.xs }, false: { paddingHorizontal: space.lg } },
    loading: {
      true: { borderColor: "$line" },
    },
  } as const,
});
const toneOf: Record<ActionKind, TextTone & IconTone> = {
  primary: "onAccent",
  secondary: "accent",
  quiet: "accent",
  danger: "bad",
};
const inactiveSurface = {
  primary: "$accentSoft",
  secondary: "$raised",
  quiet: "transparent",
  danger: "$badSoft",
} as const;
const inactiveTone: Record<ActionKind, TextTone & IconTone> = {
  primary: "text",
  secondary: "muted",
  quiet: "muted",
  danger: "bad",
};
type ActionProps = {
  label?: string | undefined;
  icon?: IconName | undefined;
  kind?: ActionKind;
  goto?: string | undefined;
  part?: string;
  a11y?: string;
  full?: boolean;
  action?: Exclude<ActionName, "flip" | "move" | "swipe">;
  value?: string | number | boolean;
  disabled?: boolean;
};

function ActionContent({
  label,
  icon,
  part,
  tone,
  loading,
  quiet,
}: Pick<ActionProps, "label" | "icon" | "part"> & {
  tone: TextTone & IconTone;
  loading: boolean;
  quiet: boolean;
}) {
  return (
    <XStack position="relative" alignItems="center">
      <XStack
        gap={space.sm}
        alignItems="center"
        {...(loading ? { opacity: component.base.none, "aria-hidden": true } : {})}
      >
        {icon && (
          <KitIcon
            name={icon}
            tone={tone}
            scale={label ? "sm" : "md"}
            part={`${part}_icon`}
            decorative={loading}
          />
        )}
        {label && (
          <KitText role="label" tone={tone} part={loading ? null : `${part}_label`}>
            {label}
          </KitText>
        )}
      </XStack>
      {loading && quiet && (
        <XStack
          position="absolute"
          width="100%"
          height={typography.label.size * 0.6}
          backgroundColor="$line"
          borderRadius={radius.sm}
        />
      )}
    </XStack>
  );
}

function useActionPress(props: ActionProps, address: string, inactive: boolean) {
  const kit = useKit();
  if (!kit.interactive || inactive) return {};
  if (kit.controller)
    return {
      onPress: () =>
        props.action
          ? kit.controller!.act({
              address,
              action: props.action,
              ...(props.value === undefined ? {} : { value: props.value }),
            })
          : kit.controller!.press(address),
    };
  return props.goto ? { onPress: () => kit.onLink?.(props.goto!, address) } : {};
}

export function KitAction({
  label,
  icon,
  kind = "primary",
  goto,
  part = "root",
  a11y,
  full = false,
  action,
  value,
  disabled = false,
}: ActionProps) {
  const kit = useKit();
  const ks = useKitStyle();
  const address = usePart(part);
  const loading = useComponentState() === "loading";
  const tone = kind === "quiet" && icon === "close" ? "muted" : toneOf[kind];
  const [pressed, setPressed] = useState(false);
  const pressScale = useAnimatedValue(
    pressed && !kit.environment.reduceMotion && !kit.environment.agentMode ? motion.pressScale : 1,
    kit.environment.reduceMotion || kit.environment.agentMode,
  );
  const blocked =
    kit.interactive &&
    kit.controller &&
    !(action
      ? kit.controller.actionsAt(address.testID).includes(action)
      : kit.controller.canPress(address.testID));
  const inactive = loading || disabled || Boolean(blocked);
  const captionTone = loading ? "text" : inactive ? inactiveTone[kind] : tone;
  const fill = loading ? (kind === "quiet" ? "transparent" : "$line") : inactiveSurface[kind];
  const handlers = useActionPress({ action, value, goto } as ActionProps, address.testID, inactive);
  return (
    <Frame
      {...address}
      kind={kind}
      backgroundColor={inactive ? fill : undefined}
      loading={loading}
      scale={pressScale}
      {...(kit.interactive && !inactive
        ? { onPressIn: () => setPressed(true), onPressOut: () => setPressed(false) }
        : {})}
      iconOnly={!label}
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      {...(full ? { alignSelf: "stretch" } : { alignSelf: "flex-start" })}
      accessibilityRole={loading ? undefined : "button"}
      aria-busy={loading || undefined}
      {...(!isWeb ? { accessibilityState: { disabled: inactive } } : {})}
      aria-disabled={inactive || undefined}
      {...(inactive ? { tabIndex: -1 } : {})}
      accessibilityLabel={label ?? a11y}
      {...handlers}
    >
      <ActionContent {...{ label, icon, part, tone: captionTone, loading, quiet: kind === "quiet" }} />
    </Frame>
  );
}
