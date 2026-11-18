import { useState } from "react";
import { useAnimatedValue } from "../motion";
import { motion } from "../../catalog";
import { XStack, styled, isWeb } from "tamagui";
import { component, radius, size, space, type IconName } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { usePart } from "../part";
import { KitIcon, type IconTone } from "./KitIcon";
import { KitText, type TextTone } from "./KitText";
import { shifted } from "./style";

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
  } as const,
});

const toneOf: Record<ActionKind, TextTone & IconTone> = {
  primary: "onAccent",
  secondary: "accent",
  quiet: "accent",
  danger: "bad",
};

/**
 * Something the person presses: a labelled button, or an icon-only button when `label` is absent
 * (give `a11y` then). Presses follow `goto` through the host's onLink when the kit is interactive.
 */
export function KitAction({
  label,
  icon,
  kind = "primary",
  goto,
  part = "root",
  a11y,
  full = false,
  action,
  disabled = false,
}: {
  label?: string | undefined;
  icon?: IconName | undefined;
  kind?: ActionKind;
  goto?: string | undefined;
  part?: string;
  a11y?: string;
  full?: boolean;
  action?: "press" | "dismiss" | "play" | "pause";
  disabled?: boolean;
}) {
  const kit = useKit();
  const ks = useKitStyle();
  const address = usePart(part);
  const tone = toneOf[kind];
  const [pressed, setPressed] = useState(false);
  const pressScale = useAnimatedValue(
    pressed && !kit.environment.reduceMotion && !kit.environment.agentMode ? motion.pressScale : 1,
    kit.environment.reduceMotion || kit.environment.agentMode,
  );
  const inactive =
    disabled || Boolean(kit.interactive && kit.controller && !kit.controller.canPress(address.testID));
  return (
    <Frame
      {...address}
      kind={kind}
      scale={pressScale}
      {...(kit.interactive ? { onPressIn: () => setPressed(true), onPressOut: () => setPressed(false) } : {})}
      iconOnly={!label}
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      {...(full ? { alignSelf: "stretch" } : { alignSelf: "flex-start" })}
      accessibilityRole="button"
      {...(!isWeb ? { accessibilityState: { disabled: inactive } } : {})}
      aria-disabled={inactive || undefined}
      {...(inactive ? { opacity: component.base.disabledOpacity, tabIndex: -1 } : {})}
      accessibilityLabel={label ?? a11y}
      {...(kit.interactive && !inactive && kit.controller
        ? {
            onPress: () =>
              action
                ? kit.controller!.act({ address: address.testID, action })
                : kit.controller!.press(address.testID),
          }
        : kit.interactive && !inactive && goto
          ? { onPress: () => kit.onLink?.(goto, address.testID) }
          : {})}
    >
      {icon && <KitIcon name={icon} tone={tone} scale={label ? "sm" : "md"} part={`${part}_icon`} />}
      {label && (
        <KitText role="label" tone={tone} part={`${part}_label`}>
          {label}
        </KitText>
      )}
    </Frame>
  );
}
