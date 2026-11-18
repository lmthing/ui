import { XStack, styled } from "tamagui";
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
}: {
  label?: string | undefined;
  icon?: IconName | undefined;
  kind?: ActionKind;
  goto?: string | undefined;
  part?: string;
  a11y?: string;
  full?: boolean;
  action?: "press" | "dismiss" | "play" | "pause";
}) {
  const kit = useKit();
  const ks = useKitStyle();
  const address = usePart(part);
  const tone = toneOf[kind];
  return (
    <Frame
      {...address}
      kind={kind}
      iconOnly={!label}
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      {...(full ? { alignSelf: "stretch" } : { alignSelf: "flex-start" })}
      accessibilityRole="button"
      accessibilityLabel={label ?? a11y}
      {...(kit.interactive && kit.controller
        ? {
            onPress: () =>
              action
                ? kit.controller!.act({ address: address.testID, action })
                : kit.controller!.press(address.testID),
          }
        : kit.interactive && goto
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
