import { YStack, isWeb, styled } from "tamagui";
import type { ReactNode } from "react";
import { component, size, space, type IconName, type ThemeDensity } from "../../../catalog";
import { useKit, useKitStyle, useVariantDensity } from "../../provider";
import { PartContext, useComponentState, usePart, usePartContext } from "../../part";
import { KitIcon } from "../text";
import { KitText } from "../text";
import { shifted } from "../text";
import { useTileBuzz } from "./tile-buzz";

const Badge = styled(YStack, {
  width: size.avatar.md,
  height: size.avatar.md,
  borderRadius: size.avatar.md,
  backgroundColor: "$accentSoft",
  alignItems: "center",
  justifyContent: "center",
});

type TileProps = {
  item: string;
  icon: IconName;
  label: string;
  /** Label address; null leaves the visible label unaddressed. */
  labelPart?: string | null;
  /** Badge treatment independent of selection and availability. */
  badgeTone?: "accent" | "muted";
  goto?: string | undefined;
  on?: boolean;
  disabled?: boolean;
  detail?: ReactNode;
  action?: "press" | "toggle" | "start" | "stop";
  touchTarget?: "buzz";
  /** Place the badge alongside a shared label and detail rail. */
  layout?: "row" | "stack";
  density?: ThemeDensity | undefined;
  /** Reserve space for the selected border and use a neutral badge when off. */
  distinctSelection?: boolean;
};
function TileLine({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <YStack position="relative">
      <YStack
        {...(loading
          ? { opacity: component.base.none, ...(isWeb ? { style: { visibility: "hidden" } as never } : {}) }
          : {})}
      >
        {children}
      </YStack>
      {loading && (
        <YStack
          position="absolute"
          top="50%"
          marginTop={-space.sm / 2}
          left={component.base.none}
          width="100%"
          height={space.sm}
          backgroundColor="$line"
          aria-hidden
        />
      )}
    </YStack>
  );
}

function TileContent({
  icon,
  label,
  labelPart = "label",
  badgeTone,
  detail,
  disabled,
  loading,
  on,
  distinctSelection,
  layout,
}: Pick<
  TileProps,
  "icon" | "label" | "labelPart" | "badgeTone" | "detail" | "disabled" | "on" | "distinctSelection" | "layout"
> & {
  loading: boolean;
}) {
  const ks = useKitStyle();
  const neutral = disabled || (badgeTone ? badgeTone === "muted" : distinctSelection && !on);
  const row = layout === "row";
  const stretch = !row && (distinctSelection || detail != null);
  return (
    <>
      <Badge
        flexShrink={component.base.none}
        backgroundColor={loading ? "$line" : neutral ? "$raised" : "$accentSoft"}
      >
        {!loading && <KitIcon name={icon} tone={neutral ? "muted" : "accent"} scale="lg" />}
      </Badge>
      <YStack
        alignSelf={stretch ? "stretch" : undefined}
        alignItems={stretch || row ? "stretch" : "center"}
        {...(row ? { flex: component.base.bodyFlex, minWidth: component.base.none } : {})}
        gap={space.xs}
        aria-hidden={loading || undefined}
        borderRadius={shifted("sm", ks.radiusShift)}
      >
        <TileLine loading={loading}>
          <KitText
            role="label"
            align={row ? "start" : "center"}
            tone={disabled ? "muted" : "text"}
            part={loading ? null : labelPart}
            lines={2}
          >
            {label}
          </KitText>
        </TileLine>
        {detail && <TileLine loading={loading}>{detail}</TileLine>}
      </YStack>
    </>
  );
}

function useTileFinish({ density, detail, distinctSelection, on }: Omit<TileProps, "item">) {
  const { rowPad, contentGap } = useVariantDensity(density);
  const compact = density === "compact";
  const vertical = detail != null ? (compact ? "xs" : "sm") : compact ? rowPad : "md";
  return {
    gap: compact ? space[contentGap] : space.sm,
    paddingVertical: space[vertical],
    ...(on || distinctSelection
      ? { borderWidth: component.base.strongBorder, borderColor: on ? "$accent" : "transparent" }
      : {}),
  };
}

function Tile(props: Omit<TileProps, "item">) {
  const { label, goto, on, disabled = false, action, touchTarget } = props;
  const kit = useKit();
  const ks = useKitStyle();
  const part = usePart(touchTarget);
  const loading = useComponentState() === "loading";
  const timed = useTileBuzz(part.testID, touchTarget !== undefined, disabled || loading);
  const finish = useTileFinish(props);
  const layout = props.layout ?? (touchTarget && props.detail != null ? "row" : "stack");
  const press = () => {
    if (kit.controller)
      return action
        ? kit.controller.act({ address: part.testID, action })
        : kit.controller.press(part.testID);
    if (goto && !action) kit.onLink?.(goto, part.testID);
  };
  return (
    <YStack
      {...part}
      alignItems="center"
      flexDirection={layout === "row" ? "row" : "column"}
      {...finish}
      paddingHorizontal={space.sm}
      minHeight={size.control.lg}
      borderRadius={shifted("md", ks.radiusShift)}
      backgroundColor={on ? "$accentSoft" : undefined}
      {...(!isWeb && touchTarget && !loading ? { accessible: true } : {})}
      accessibilityRole={loading ? undefined : goto && !action && !touchTarget ? "link" : "button"}
      accessibilityLabel={loading ? undefined : label}
      aria-pressed={on}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      {...(disabled || loading
        ? { tabIndex: -1, ...(!isWeb ? { accessibilityState: { disabled: true } } : {}) }
        : touchTarget && isWeb && kit.interactive && kit.controller
          ? { tabIndex: 0 }
          : {})}
      {...((!touchTarget && kit.interactive && !disabled && !loading && (kit.controller || goto)
        ? {
            onPress: press,
            onKeyDown: (event: { key: string; preventDefault(): void }) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                press();
              }
            },
          }
        : {}) as object)}
      {...(timed as object)}
    >
      <TileContent {...props} {...{ disabled, loading, layout }} />
    </YStack>
  );
}

/**
 * One pressable item tile: an icon in a soft round badge over a centred label, the whole tile one
 * address (`<item>/root` or the optional `<item>/buzz`, with `icon` and `label` parts).
 */
export function KitTile({ item, ...props }: TileProps) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Tile {...props} />
    </PartContext.Provider>
  );
}
