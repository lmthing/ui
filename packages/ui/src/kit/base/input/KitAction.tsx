import { XStack, styled, isWeb } from "tamagui";
import { useCopyFeedback } from "../../interact";
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
import { useKit, useKitStyle } from "../../provider";
import { useComponentState, usePart } from "../../part";
import { KitIcon, KitText, shifted, type IconTone, type TextTone } from "../text";
import { useActionPress } from "./use-action-press";
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
  action?: Exclude<ActionName, "swipe" | "seek" | "flip" | "move">;
  value?: string | number | boolean;
  disabled?: boolean;
  copiedLabel?: string;
};
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
}: ActionProps) {
  const kit = useKit();
  const ks = useKitStyle();
  const address = usePart(part ?? undefined, part !== null);
  const loading = useComponentState() === "loading";
  const tone = kind === "quiet" && icon === "close" ? "muted" : toneOf[kind];
  const blocked =
    kit.interactive &&
    kit.controller &&
    !(action
      ? kit.controller.actionsAt(address.testID).includes(action)
      : kit.controller.canPress(address.testID));
  const noCopyValue = action === "copy" && (typeof value !== "string" || value.length === 0);
  const inactive = part === null || loading || disabled || noCopyValue || Boolean(blocked);
  const copyAddress = action === "copy" && part !== null ? address.testID : undefined;
  const copied = useCopyFeedback(copyAddress, value, loading || disabled) && !inactive;
  const inactiveTone = kind === "primary" ? "text" : kind === "danger" ? "bad" : "muted";
  const captionTone = loading ? "text" : inactive ? inactiveTone : copied ? "good" : tone;
  const fill = loading ? (kind === "quiet" ? "transparent" : "$line") : inactiveSurface[kind];
  const handlers = useActionPress({ action, value, goto }, address.testID, inactive);
  return (
    <Frame
      {...(part === null ? {} : address)}
      kind={kind}
      backgroundColor={inactive ? fill : copied ? "$goodSoft" : undefined}
      loading={loading}
      iconOnly={!label}
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      {...(full ? { alignSelf: "stretch" } : { alignSelf: "flex-start" })}
      accessibilityRole={loading ? undefined : "button"}
      aria-busy={loading || undefined}
      {...(!isWeb ? { accessibilityState: { disabled: inactive } } : {})}
      {...(inactive ? { "aria-disabled": true, tabIndex: -1 } : {})}
      accessibilityLabel={(copied ? copiedLabel : undefined) ?? label ?? a11y}
      aria-live={action === "copy" ? "polite" : undefined}
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
