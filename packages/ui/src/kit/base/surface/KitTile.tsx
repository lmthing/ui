import { YStack, isWeb, styled } from "tamagui";
import type { ReactNode } from "react";
import { component, size, space, type IconName } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, useComponentState, usePart, usePartContext } from "../../part";
import { KitIcon } from "../text";
import { KitText } from "../text";
import { shifted } from "../text";

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
  goto?: string | undefined;
  on?: boolean;
  disabled?: boolean;
  detail?: ReactNode;
  action?: "press" | "toggle" | "start" | "stop";
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
  detail,
  disabled,
  loading,
}: Pick<TileProps, "icon" | "label" | "detail" | "disabled"> & { loading: boolean }) {
  const ks = useKitStyle();
  return (
    <>
      <Badge backgroundColor={loading ? "$line" : disabled ? "$raised" : "$accentSoft"}>
        {!loading && <KitIcon name={icon} tone={disabled ? "muted" : "accent"} scale="lg" />}
      </Badge>
      <YStack
        alignItems="center"
        gap={space.xs}
        aria-hidden={loading || undefined}
        borderRadius={shifted("sm", ks.radiusShift)}
      >
        <TileLine loading={loading}>
          <KitText
            role="label"
            align="center"
            tone={disabled ? "muted" : "text"}
            part={loading ? null : "label"}
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

function Tile({ icon, label, goto, on, disabled = false, detail, action }: Omit<TileProps, "item">) {
  const kit = useKit();
  const ks = useKitStyle();
  const part = usePart();
  const loading = useComponentState() === "loading";
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
      gap={space.sm}
      paddingVertical={space.md}
      paddingHorizontal={space.sm}
      minHeight={size.control.lg}
      borderRadius={shifted("md", ks.radiusShift)}
      backgroundColor={on ? "$accentSoft" : undefined}
      {...(on ? { borderWidth: component.base.strongBorder, borderColor: "$accent" } : {})}
      accessibilityRole={loading ? undefined : goto && !action ? "link" : "button"}
      accessibilityLabel={loading ? undefined : label}
      aria-pressed={on}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      {...(disabled || loading
        ? { tabIndex: -1, ...(!isWeb ? { accessibilityState: { disabled: true } } : {}) }
        : {})}
      {...((kit.interactive && !disabled && !loading && (kit.controller || goto)
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
    >
      <TileContent {...{ icon, label, detail, disabled, loading }} />
    </YStack>
  );
}

/**
 * One pressable item tile: an icon in a soft round badge over a centred label, the whole tile one
 * address (`<item>/root`, with `icon` and `label` parts). For quick-action grids (`Actions`).
 */
export function KitTile({ item, ...props }: TileProps) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Tile {...props} />
    </PartContext.Provider>
  );
}
