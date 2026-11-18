import { useEffect, useRef, useState } from "react";
import { ScrollView, XStack, YStack } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { useAnimatedValue } from "../../motion";
import { KitText, shifted } from "../text";
import { OptionLabel, WheelDrawing, type WheelDrawingProps } from "./KitWheelDrawing";
type Option = { id: string; label: string; disabled?: boolean };
type WheelProps = {
  part?: string;
  loading?: boolean;
  options: readonly Option[];
  at?: string;
  rotation: number;
  busy?: boolean;
  style?: "wheel" | "strip";
};
function StripDrawing({
  options,
  at,
  angle,
  loading,
}: {
  options: readonly Option[];
  at?: string | undefined;
  angle: number;
  loading: boolean;
}) {
  const context = usePartContext();
  const scroll = useRef<{ scrollTo(options: { x: number; animated: boolean }): void }>(null);
  const ks = useKitStyle();
  const [viewport, setViewport] = useState(0);
  const width = size.control.md * 3;
  const offset = (((angle % 1) + 1) % 1) * Math.max(0, options.length - 1) * (width + space.sm);
  useEffect(() => {
    scroll.current?.scrollTo({ x: offset, animated: false });
  }, [offset, viewport]);
  return (
    <YStack gap={space.sm}>
      <ChevronDown size={size.icon.lg} color="$text" alignSelf="center" aria-hidden />
      <ScrollView
        ref={scroll as never}
        horizontal
        showsHorizontalScrollIndicator
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
      >
        <XStack
          gap={space.sm}
          paddingVertical={space.xs}
          paddingHorizontal={Math.max(space.xs, (viewport - width) / 2)}
        >
          {options.map((option) => (
            <YStack
              key={option.id}
              width={width}
              minHeight={size.control.md}
              padding={space.md}
              borderRadius={shifted("md", ks.radiusShift)}
              borderWidth={component.base.strongBorder}
              borderColor={!loading && option.id === at ? "$accent" : "$muted"}
              backgroundColor={!loading && option.id === at ? "$accentSoft" : "$surface"}
            >
              <PartContext.Provider value={{ ...context, item: option.id }}>
                <OptionLabel option={option} selected={at === option.id} loading={loading} />
              </PartContext.Provider>
            </YStack>
          ))}
        </XStack>
      </ScrollView>
    </YStack>
  );
}

/** Equal caller-supplied sectors or a moving rail; rotation is turns, not a random outcome. */
export function KitWheel({
  part = "root",
  loading = false,
  options,
  at,
  rotation,
  busy = false,
  style = "wheel",
}: WheelProps) {
  const kit = useKit();
  const hidden = loading;
  const angle = useAnimatedValue(
    Number.isFinite(rotation) ? rotation : 0,
    loading || kit.environment.reduceMotion || kit.environment.agentMode,
  );
  const thing = useEmptyThing();
  const rows =
    loading && !options.length
      ? Array.from({ length: 4 }, (_, i) => ({ id: `r${i + 1}`, label: "" }))
      : options;
  const Drawing = style === "wheel" ? WheelDrawing : StripDrawing;
  return (
    <YStack
      {...usePart(part)}
      width="100%"
      minWidth={component.base.none}
      gap={space.md}
      aria-busy={loading || busy}
    >
      <Drawing options={rows} at={at} angle={angle} loading={hidden} />
      {!loading && !options.length && (
        <KitText part={null} tone="muted" align="center">
          {emptyLine(thing)}
        </KitText>
      )}
    </YStack>
  );
}
