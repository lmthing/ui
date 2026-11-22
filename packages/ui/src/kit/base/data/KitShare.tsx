import type { ReactNode } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { component, numberLine, radius, size, space, type IconName } from "../../../catalog";
import { PartContext, useComponentState, usePart, usePartContext, usePartDisabled } from "../../part";
import { useKit, useWords } from "../../provider";
import { buttonEvents } from "../controls";
import { KitIcon, KitText } from "../text";

// One accent, fading by step in the order the parts are written.
const fade = (index: number) => Math.max(component.base.shareFloor, 1 - index * component.base.shareStep);

type SharePoint = {
  id: string;
  label: string;
  value: number;
  icon?: IconName | undefined;
  press?: boolean | undefined;
};

type Legend = { icons: boolean; actions: boolean };

function LegendRow({ press, label, children }: { press: boolean; label: string; children: ReactNode }) {
  const address = usePart();
  const { controller, interactive } = useKit();
  const state = useComponentState();
  const blocked = usePartDisabled(address.testID);
  const active = press && !blocked && interactive && controller?.canPress(address.testID);
  return (
    <XStack
      {...address}
      {...(press ? { accessibilityRole: "button", accessibilityLabel: label } : {})}
      aria-disabled={(press && (blocked || state === "loading" || (interactive && !active))) || undefined}
      {...(active && isWeb ? { tabIndex: 0, cursor: "pointer" } : {})}
      {...(active ? buttonEvents(() => controller!.press(address.testID)) : {})}
      minHeight={size.control.md}
      alignItems="center"
      gap={space.sm}
    >
      {children}
      {press ? <KitIcon name="chevron_right" decorative /> : <YStack width={size.icon.md} aria-hidden />}
    </XStack>
  );
}

function Entry({
  point,
  percent,
  index,
  icons,
  actions,
}: {
  point: SharePoint;
  percent: string;
  index: number;
} & Legend) {
  const { lang } = useWords();
  const address = usePart("root", !actions);
  const { label, value, icon, press = false } = point;
  const leading = icon ? (
    <YStack opacity={fade(index)}>
      <KitIcon name={icon} decorative tone="accent" />
    </YStack>
  ) : (
    <YStack
      width={component.base.dot}
      height={component.base.dot}
      borderRadius={radius.pill}
      backgroundColor="$accent"
      opacity={fade(index)}
      aria-hidden
    />
  );
  const percentage = (
    <KitText role="body" tone="muted" tabular part={null}>
      {percent}
    </KitText>
  );
  const content = (
    <>
      {icons ? (
        <YStack width={size.icon.md} alignItems="center">
          {leading}
        </YStack>
      ) : (
        leading
      )}
      <KitText role="body" part="label" lines={1}>
        {label}
      </KitText>
      <YStack flex={1} />
      <KitText role="number" numberScale="compact" tabular part={null}>
        {numberLine(value, lang)}
      </KitText>
      {actions ? (
        <YStack width={size.control.md} alignItems="flex-end">
          {percentage}
        </YStack>
      ) : (
        percentage
      )}
    </>
  );
  return actions ? (
    <LegendRow press={press} label={`${label}, ${numberLine(value, lang)}, ${percent}`}>
      {content}
    </LegendRow>
  ) : (
    <XStack {...address} alignItems="center" gap={space.sm}>
      {content}
    </XStack>
  );
}

/**
 * How a whole splits into parts: one full-width bar cut into shares (in fading accent, in the order given) over
 * a legend of label, value and percent. Each part is an item (`<item>/root`, `<item>/label`); the bar
 * drawing is hidden from assistive tech, so shares belong in the component's read line.
 */
export function KitShare({
  points,
  percentOf,
}: {
  points: readonly SharePoint[];
  percentOf: (value: number, total: number) => string;
}) {
  const context = usePartContext();
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const icons = points.some((point) => point.icon !== undefined);
  const actions = points.some((point) => point.press);
  const legend = points.map((point, index) => (
    <PartContext.Provider key={point.id} value={{ ...context, item: point.id }}>
      <Entry point={point} percent={percentOf(point.value, total)} {...{ index, icons, actions }} />
    </PartContext.Provider>
  ));
  return (
    <YStack gap={space.md}>
      <XStack
        height={space.md}
        borderRadius={radius.pill}
        overflow="hidden"
        backgroundColor="$line"
        aria-hidden
      >
        {points.map((point, index) => (
          <YStack
            key={point.id}
            flexGrow={point.value}
            flexBasis={component.base.none}
            backgroundColor="$accent"
            opacity={fade(index)}
          />
        ))}
      </XStack>
      {actions ? <YStack>{legend}</YStack> : legend}
    </YStack>
  );
}
