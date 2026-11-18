import { XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted, type TextRole, type TextTone } from "../text";
import { plotGeometry, type LinePlotProps, type Point, type Target } from "./linePlotGeometry";

export function PlotLabel({
  label,
  loading,
  role = "label",
  tone = "muted",
}: {
  label?: string;
  loading?: boolean;
  role?: TextRole;
  tone?: TextTone;
}) {
  const ks = useKitStyle();
  return (
    <YStack backgroundColor={loading ? "$line" : "transparent"} borderRadius={shifted("sm", ks.radiusShift)}>
      <YStack
        opacity={loading ? component.base.none : 1}
        {...(loading ? { visibility: "hidden" as const } : {})}
      >
        <KitText role={role} tone={tone} part={null} tabular>
          {label}
        </KitText>
      </YStack>
    </YStack>
  );
}

function PointTarget({
  point,
  target,
  selected,
  loading,
}: {
  point: Point;
  target: Target;
  selected: boolean;
  loading?: boolean;
}) {
  const address = usePart(target.part, !loading);
  const kit = useKit(),
    ks = useKitStyle();
  const select = () => kit.controller?.act({ address: address.testID, action: "select" });
  const control = loading
    ? {}
    : {
        ...address,
        accessibilityRole: "button",
        accessibilityLabel: `${point.label}, ${point.value}`,
        "aria-pressed": selected,
        ...(kit.interactive && kit.controller
          ? {
              focusable: true,
              cursor: "pointer",
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                select();
              },
              onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  select();
                }
              },
            }
          : {}),
      };
  return (
    <YStack
      {...(control as object)}
      minWidth={size.control.md}
      minHeight={size.control.md}
      padding={space.sm}
      justifyContent="center"
      borderRadius={shifted("sm", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor={selected && !loading ? "$accent" : "$line"}
      backgroundColor={loading ? "$line" : selected ? "$accentSoft" : "$surface"}
    >
      <PlotLabel label={point.label} loading={!!loading} tone="text" />
    </YStack>
  );
}

export function PlotTargets({ targets, series, selected, loading }: LinePlotProps) {
  const context = usePartContext();
  const controls = (targets ?? []).flatMap(({ point, target }) => {
    const reading = series.flatMap((line) => line.points).find((p) => p.id === point);
    return reading && reading.value !== null && Number.isFinite(reading.value) && Number.isFinite(reading.x)
      ? [{ point: reading, target }]
      : [];
  });
  return (
    !!controls.length && (
      <XStack flexWrap="wrap" gap={space.sm}>
        {controls.map(({ point, target }) => (
          <PartContext.Provider
            key={point.id}
            value={{ ...context, ...(target.item ? { item: target.item } : {}) }}
          >
            <PointTarget point={point} target={target} selected={point.id === selected} loading={!!loading} />
          </PartContext.Provider>
        ))}
      </XStack>
    )
  );
}

export function PlotLabels({ series, unit, goal, loading }: LinePlotProps) {
  const geometry = plotGeometry(series, goal);
  const labels = [
    ...series.map((line) => ({ label: line.label, tone: line.tone ?? "accent" })),
    ...(goal ? [{ label: goal.label, tone: "muted" as const }] : []),
    ...(unit ? [{ label: unit, tone: "muted" as const }] : []),
  ];
  return (
    <YStack gap={space.sm}>
      <XStack justifyContent="space-between" gap={space.md}>
        {[geometry.first, geometry.last].map((label, i) => (
          <YStack key={i} flex={1} alignItems={i ? "flex-end" : "flex-start"}>
            <PlotLabel {...(label ? { label } : {})} loading={!!loading} role="caption" />
          </YStack>
        ))}
      </XStack>
      <XStack flexWrap="wrap" gap={space.md}>
        {labels.map((entry, i) => (
          <PlotLabel key={i} {...entry} loading={!!loading} />
        ))}
      </XStack>
    </YStack>
  );
}
