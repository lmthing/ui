import { useId, useLayoutEffect, useState } from "react";
import { XStack, YStack, styled, isWeb, VisuallyHidden } from "tamagui";
import {
  accentGlow,
  component,
  layoutType,
  motion,
  radius,
  size,
  space,
  type as typography,
  type ActionName,
  type IconName,
  type KitStyle,
} from "../../../catalog";
import {
  useActionPress as useActionDispatch,
  useCopyFeedback,
  usePrivateStatusAt,
  useRevealControl,
} from "../../interact";
import { useMotionValue } from "../../motion";
import { useComponentState, usePart, usePartContext, usePartDisabled } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { useSequenceHold, type HoldToPause } from "../controls";
import { KitIcon, KitText, shifted, type IconTone, type TextTone } from "../text";

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
      secondary: {
        backgroundColor: "$accentSoft",
        borderColor: "$accent",
        borderWidth: component.base.borderWidth,
      },
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
  /** Decorative text mark in the same rail as a labelled action's icon. */
  mark?: string | undefined;
  kind?: ActionKind;
  /** Neutral treatment for secondary and quiet actions. */
  tone?: "accent" | "neutral";
  align?: "start";
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
  /** Tap still activates this part; a continuous press temporarily pauses the addressed sequence. */
  holdToPause?: HoldToPause;
};

function useActionAvailability(
  address: string,
  part: string | null,
  action: string | undefined,
  disabled: boolean,
) {
  const { interactive, controller } = useKit();
  const { component: id, item } = usePartContext();
  const hostPart = part !== null && controller?.hasHostCommandsAt?.(id, part, item !== undefined) === true;
  useLayoutEffect(
    () => (disabled && hostPart ? controller?.registerDisabledPart(address) : undefined),
    [address, controller, disabled, hostPart],
  );
  const offered =
    interactive &&
    controller &&
    (action
      ? controller.actionsAt(address, { ignoreDisabledPart: hostPart }).includes(action)
      : controller.canPress(address, { ignoreDisabledPart: hostPart }));
  const blocked = usePartDisabled(part === null ? undefined : address);
  const loading = useComponentState() === "loading" && !offered;
  return {
    loading,
    inactive: loading || disabled || blocked || Boolean(interactive && controller && !offered),
  };
}

function useActionPress(
  props: { action: ActionProps["action"]; value: ActionProps["value"]; goto: ActionProps["goto"] },
  address: string,
  inactive: boolean,
  reveal: boolean,
) {
  const kit = useKit();
  const [pressed, setPressed] = useState(false);
  const settled = inactive || kit.environment.agentMode || kit.environment.reduceMotion;
  const scale = useMotionValue(pressed && !settled ? motion.pressScale : 1, settled);
  const dispatch = useActionDispatch(props, address, inactive, reveal);
  if (!kit.interactive || inactive) return { scale };
  return { scale, onPressIn: () => setPressed(true), onPressOut: () => setPressed(false), ...dispatch };
}

function useCopyState(address: string | undefined, value: unknown, hostCopy: boolean, disabled: boolean) {
  const local = useCopyFeedback(address, hostCopy ? undefined : value, disabled, hostCopy);
  const host = usePrivateStatusAt(hostCopy ? address : undefined, "copy");
  return {
    missing: Boolean(address && !hostCopy && (typeof value !== "string" || !value.length)),
    copied: local || host === "approved",
  };
}

function useActionBehavior({
  goto,
  part = "root",
  action,
  value,
  disabled = false,
  hostCopy = false,
  holdToPause,
}: ActionProps) {
  const address = usePart(part ?? undefined, part !== null);
  const { loading, inactive: unavailable } = useActionAvailability(address.testID, part, action, disabled);
  const copy = action === "copy";
  const reveal = useRevealControl(address.testID, part === null ? "none" : action, disabled || loading);
  const feedback = useCopyState(
    copy && part !== null ? address.testID : undefined,
    value,
    hostCopy,
    loading || disabled,
  );
  const inactive = part === null || unavailable || feedback.missing;
  const handlers = useActionPress({ action, value, goto }, address.testID, inactive, reveal);
  const blocked = usePartDisabled(holdToPause ? address.testID : undefined);
  const hold = useSequenceHold(
    holdToPause,
    address.testID,
    { tap: !inactive, hold: part !== null && !disabled && !loading && !blocked },
    () => {
      if ("onPress" in handlers) handlers.onPress?.();
    },
  );
  return {
    address,
    loading,
    inactive: inactive && !hold.enabled,
    copy,
    copied: feedback.copied && !inactive,
    status: hold.status,
    handlers: holdToPause ? hold.events : handlers,
  };
}

function ActionMark({ mark, tone }: { mark: string; tone: TextTone }) {
  return (
    <XStack
      width={size.icon.sm}
      alignItems="center"
      justifyContent="center"
      aria-hidden
      accessibilityElementsHidden
    >
      <KitText role={layoutType.meta} tone={tone} part={null}>
        {mark}
      </KitText>
    </XStack>
  );
}

function ActionContent({
  label,
  icon,
  mark,
  part,
  contentParts,
  tone,
  loading,
  quiet,
}: Pick<ActionProps, "label" | "icon" | "mark" | "part" | "contentParts"> & {
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
        {!icon && mark && <ActionMark mark={mark} tone={tone} />}
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

/** Shared frame geometry for the real action and its neutral loading placeholder. */
export function actionGeometry({ frame, radiusShift }: KitStyle, kind: ActionKind, standaloneIcon: boolean) {
  return {
    borderRadius: frame.action === "pill" || standaloneIcon ? radius.pill : shifted("md", radiusShift),
    minHeight:
      kind === "primary" && frame.action === "block" && !standaloneIcon
        ? size.control.lg + space.xs
        : size.control.md,
  };
}

function useActionFinish(kind: ActionKind, standaloneIcon: boolean, active: boolean) {
  const style = useKitStyle();
  return {
    ...actionGeometry(style, kind, standaloneIcon),
    ...(kind === "primary" && style.frame.action === "glow" && active
      ? {
          ...accentGlow,
          shadowColor: "$accent",
          shadowOffset: { width: component.base.none, height: component.base.none },
        }
      : {}),
  } as const;
}

function actionAppearance(
  props: ActionProps,
  kind: ActionKind,
  loading: boolean,
  inactive: boolean,
  copied: boolean,
) {
  const bare = kind === "quiet" || (kind === "danger" && !props.label);
  const neutral =
    props.tone === "neutral" || (props.tone === undefined && (!props.label || props.icon === "close"));
  const neutralOutline = kind === "secondary" && props.tone === "neutral";
  const tone = neutralOutline ? "text" : kind === "quiet" && neutral ? "muted" : toneOf[kind];
  const inactiveTone = kind === "primary" ? "text" : kind === "danger" ? "bad" : "muted";
  const captionTone = loading ? "text" : inactive ? inactiveTone : copied ? "good" : tone;
  const fill = loading ? (bare ? "transparent" : "$line") : inactiveSurface[kind];
  const frame = {
    ...(props.align === "start" ? { justifyContent: "flex-start" as const } : {}),
    borderColor: neutralOutline || (kind === "secondary" && inactive) ? "$line" : undefined,
    borderWidth: bare ? component.base.none : undefined,
    backgroundColor: inactive ? fill : copied ? "$goodSoft" : neutralOutline ? "$surface" : undefined,
  } as const;
  return { bare, captionTone, frame };
}

export function KitAction(props: ActionProps) {
  const {
    label,
    icon,
    kind = "primary",
    part = "root",
    contentParts,
    a11y,
    full,
    copiedLabel,
    holdToPause,
  } = props;
  const { address, loading, inactive, copy, copied, status, handlers } = useActionBehavior(props);
  const finish = useActionFinish(kind, !label && !full, !inactive && !copied);
  const { bare, captionTone, frame } = actionAppearance(props, kind, loading, inactive, copied);
  const statusId = useId();
  return (
    <>
      <Frame
        {...(part === null ? {} : address)}
        kind={kind}
        {...frame}
        {...finish}
        loading={loading}
        iconOnly={!label}
        {...(isWeb && copy && !loading ? webCopyButton : {})}
        alignSelf={full ? "stretch" : "flex-start"}
        accessibilityRole={loading ? undefined : "button"}
        aria-busy={loading || undefined}
        {...(!isWeb ? { accessibilityState: { disabled: inactive } } : {})}
        {...(inactive ? { "aria-disabled": true, tabIndex: -1 } : {})}
        accessibilityLabel={(copied ? copiedLabel : undefined) ?? label ?? a11y}
        aria-live={copy ? "polite" : undefined}
        aria-describedby={isWeb && status ? statusId : undefined}
        {...handlers}
      >
        <ActionContent
          label={copied && label ? (copiedLabel ?? label) : label}
          icon={copied && icon ? "check" : icon}
          mark={props.mark}
          {...{ part, tone: captionTone, loading, quiet: bare }}
          {...(contentParts ? { contentParts } : {})}
        />
      </Frame>
      {isWeb && holdToPause && (
        <VisuallyHidden id={statusId} aria-live="polite" aria-atomic>
          {status}
        </VisuallyHidden>
      )}
    </>
  );
}

/** A separator label on the text rail of start-aligned actions with leading marks. */
export function KitActionDivider({ label, part }: { label: string; part: string }) {
  return (
    <YStack
      paddingLeft={space.lg + component.base.borderWidth + size.icon.sm + space.sm}
      paddingBottom={space.sm}
    >
      <KitText part={part} role="caption" tone="muted">
        {label}
      </KitText>
    </YStack>
  );
}
