import { XStack, styled, isWeb } from "tamagui";
import { useActionPress, useCopyFeedback, useRevealControl } from "../../interact";
import {
  component,
  layoutType,
  radius,
  size,
  space,
  type as typography,
  type ActionName,
  type IconName,
} from "../../../catalog";
import { useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { KitIcon, KitText, shifted, type IconTone, type TextTone } from "../text";
import { useActionAvailability, usePressMotion } from "./use-action-availability";

export type ActionKind = "primary" | "secondary" | "quiet" | "danger";
const webCopyButton = { tag: "button", type: "button" } as const;
const Frame = styled(XStack, {
  alignItems: "center",
  justifyContent: "center",
  borderWidth: component.base.none,
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
    loading: { true: { borderColor: "$line" } },
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
type ActionProps = {
  label?: string | undefined;
  icon?: IconName | undefined;
  kind?: ActionKind;
  goto?: string | undefined;
  part?: string | null;
  a11y?: string;
  full?: boolean;
  action?: Exclude<ActionName, "swipe" | "flip">;
  value?: string | number | boolean;
  disabled?: boolean;
  copiedLabel?: string;
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
            decorative={loading || part === null}
          />
        )}
        {label && (
          <KitText
            role={layoutType.meta}
            tone={tone}
            part={loading || part === null ? null : `${part}_label`}
          >
            {label}
          </KitText>
        )}
      </XStack>
      {loading && quiet && (
        <XStack
          position="absolute"
          width="100%"
          height={typography[layoutType.meta].size * 0.6}
          backgroundColor="$line"
          borderRadius={radius.sm}
        />
      )}
    </XStack>
  );
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
  copiedLabel,
}: ActionProps) {
  const ks = useKitStyle();
  const address = usePart(part ?? undefined, part !== null);
  const { loading, inactive: unavailable } = useActionAvailability(address.testID, part, action, disabled);
  const tone = kind === "quiet" && icon === "close" ? "muted" : toneOf[kind];
  const copy = action === "copy";
  const noCopyValue = copy && (typeof value !== "string" || value.length === 0);
  const reveal = useRevealControl(address.testID, part === null ? "none" : action, disabled || loading);
  const inactive = part === null || unavailable || noCopyValue;
  const copyAddress = action === "copy" && part !== null ? address.testID : undefined;
  const copied = useCopyFeedback(copyAddress, value, loading || disabled) && !inactive;
  const inactiveTone = kind === "primary" ? "text" : kind === "danger" ? "bad" : "muted";
  const captionTone = loading ? "text" : inactive ? inactiveTone : copied ? "good" : tone;
  const fill = loading ? (kind === "quiet" ? "transparent" : "$line") : inactiveSurface[kind];
  const motionProps = usePressMotion(inactive);
  const handlers = useActionPress({ action, value, goto }, address.testID, inactive, reveal);
  return (
    <Frame
      {...(part === null ? {} : address)}
      kind={kind}
      backgroundColor={inactive ? fill : copied ? "$goodSoft" : undefined}
      loading={loading}
      iconOnly={!label}
      {...(isWeb && copy && !loading ? webCopyButton : {})}
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      alignSelf={full ? "stretch" : "flex-start"}
      accessibilityRole={loading ? undefined : "button"}
      aria-busy={loading || undefined}
      {...(!isWeb ? { accessibilityState: { disabled: inactive } } : {})}
      {...(inactive ? { "aria-disabled": true, tabIndex: -1 } : {})}
      accessibilityLabel={(copied ? copiedLabel : undefined) ?? label ?? a11y}
      aria-live={copy ? "polite" : undefined}
      {...motionProps}
      {...handlers}
    >
      <ActionContent
        label={copied && label ? (copiedLabel ?? label) : label}
        icon={copied && icon ? "check" : icon}
        {...{ part, tone: captionTone, loading, quiet: kind === "quiet" }}
      />
    </Frame>
  );
}
