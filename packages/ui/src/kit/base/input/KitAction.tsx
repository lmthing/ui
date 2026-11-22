import { XStack, styled, isWeb } from "tamagui";
import { useCopyFeedback, usePrivateStatusAt, useRevealControl } from "../../interact";
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
import { useActionAvailability } from "./use-action-availability";
import { useActionPress } from "./use-action-press";

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
  /** When supplied, only these explicit parts are drawn for the label and icon. */
  contentParts?: { label?: string; icon?: string };
  a11y?: string;
  full?: boolean;
  action?: Exclude<ActionName, "swipe" | "flip">;
  value?: string | number | boolean;
  disabled?: boolean;
  copiedLabel?: string;
  /** Copy from the host binding, not a rendered `value`. */
  hostCopy?: boolean;
};

function useCopyState(address: string | undefined, value: unknown, hostCopy: boolean, disabled: boolean) {
  const local = useCopyFeedback(hostCopy ? undefined : address, value, disabled);
  const host = usePrivateStatusAt(hostCopy ? address : undefined, "copy", disabled);
  return {
    missing: Boolean(address && !hostCopy && (typeof value !== "string" || !value.length)),
    copied: local || host === "approved",
  };
}
function ActionContent({
  label,
  icon,
  part,
  contentParts,
  tone,
  loading,
  quiet,
}: Pick<ActionProps, "label" | "icon" | "part" | "contentParts"> & {
  tone: TextTone & IconTone;
  loading: boolean;
  quiet: boolean;
}) {
  const labelPart = contentParts ? contentParts.label : `${part}_label`;
  const iconPart = contentParts ? contentParts.icon : `${part}_icon`;
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
            {...(iconPart ? { part: iconPart } : {})}
            decorative={loading || part === null || !iconPart}
          />
        )}
        {label && (
          <KitText
            role={layoutType.meta}
            tone={tone}
            part={loading || part === null ? null : (labelPart ?? null)}
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
  contentParts,
  a11y,
  full = false,
  action,
  value,
  disabled = false,
  copiedLabel,
  hostCopy = false,
}: ActionProps) {
  const ks = useKitStyle();
  const address = usePart(part ?? undefined, part !== null);
  const { loading, inactive: unavailable } = useActionAvailability(address.testID, part, action, disabled);
  const tone = kind === "quiet" && icon === "close" ? "muted" : toneOf[kind];
  const copy = action === "copy";
  const reveal = useRevealControl(address.testID, part === null ? "none" : action, disabled || loading);
  const feedback = useCopyState(
    copy && part !== null ? address.testID : undefined,
    value,
    hostCopy,
    loading || disabled,
  );
  const inactive = part === null || unavailable || feedback.missing;
  const copied = feedback.copied && !inactive;
  const inactiveTone = kind === "primary" ? "text" : kind === "danger" ? "bad" : "muted";
  const captionTone = loading ? "text" : inactive ? inactiveTone : copied ? "good" : tone;
  const fill = loading ? (kind === "quiet" ? "transparent" : "$line") : inactiveSurface[kind];
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
      {...handlers}
    >
      <ActionContent
        label={copied && label ? (copiedLabel ?? label) : label}
        icon={copied && icon ? "check" : icon}
        {...{ part, tone: captionTone, loading, quiet: kind === "quiet" }}
        {...(contentParts ? { contentParts } : {})}
      />
    </Frame>
  );
}
