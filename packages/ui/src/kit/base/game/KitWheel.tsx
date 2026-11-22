import { useWords } from "../../provider";
import { useEffect, useRef, useState } from "react";
import { isWeb, ScrollView, XStack, YStack } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";
import { component, emptyLine, size, space } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { useAnimatedValue } from "../../motion";
import { KitIcon, KitText, shifted } from "../text";
import { OptionLabel, WheelDrawing } from "./KitWheelDrawing";
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
const stripTileWidth = size.control.md * 3;

function StripEdge({ atEnd = false }: { atEnd?: boolean }) {
  const side = atEnd ? "right" : "left";
  return (
    <YStack
      position="absolute"
      {...{ [side]: component.base.none }}
      top={component.base.none}
      bottom={component.base.none}
      width={space.md}
      pointerEvents="none"
      aria-hidden
      style={{ backgroundImage: `linear-gradient(to ${side}, transparent, var(--surface))` } as never}
    />
  );
}

function StripTile({ option, selected, loading }: { option: Option; selected: boolean; loading: boolean }) {
  const context = usePartContext();
  const ks = useKitStyle();
  return (
    <YStack
      width={stripTileWidth}
      minHeight={size.control.md}
      padding={space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      borderWidth={component.base.strongBorder}
      borderColor={loading ? "$line" : selected ? "$accent" : "$muted"}
      backgroundColor={!loading && selected ? "$accentSoft" : "$surface"}
    >
      <PartContext.Provider value={{ ...context, item: option.id }}>
        <OptionLabel {...{ option, selected, loading }} />
      </PartContext.Provider>
    </YStack>
  );
}

function StripDrawing({
  options,
  at,
  angle,
  loading,
}: {
  options: readonly Option[];
  at?: string;
  angle: number;
  loading: boolean;
}) {
  const scroll = useRef<{ scrollTo(options: { x: number; animated: boolean }): void }>(null);
  const [viewport, setViewport] = useState(0);
  const selected = options.findIndex((option) => option.id === at);
  const position = selected >= 0 ? selected : (((angle % 1) + 1) % 1) * Math.max(0, options.length - 1);
  const offset = position * (stripTileWidth + space.sm);
  useEffect(() => {
    scroll.current?.scrollTo({ x: offset, animated: false });
  }, [offset, viewport]);
  return (
    <YStack gap={space.sm}>
      <ChevronDown size={size.icon.lg} color={loading ? "$muted" : "$text"} alignSelf="center" aria-hidden />
      <YStack position="relative">
        <ScrollView
          ref={scroll as never}
          horizontal
          showsHorizontalScrollIndicator
          onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        >
          <XStack
            gap={space.sm}
            paddingVertical={space.xs}
            paddingHorizontal={Math.max(space.xs, (viewport - stripTileWidth) / 2)}
          >
            {options.map((option) => (
              <StripTile key={option.id} option={option} selected={at === option.id} loading={loading} />
            ))}
          </XStack>
        </ScrollView>
        {isWeb && (
          <>
            <StripEdge />
            <StripEdge atEnd />
          </>
        )}
      </YStack>
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
  const { lang } = useWords();

  const kit = useKit();
  const hidden = loading;
  const turns = Number.isFinite(rotation) ? rotation : 0;
  const selected = options.findIndex((option) => option.id === at);
  const target =
    !busy && options.length > 0 && style === "wheel"
      ? selected >= 0
        ? Math.round(turns) - (selected + 0.5) / options.length
        : (Math.floor(turns * options.length) + 0.5) / options.length
      : turns;
  const angle = useAnimatedValue(
    target,
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
      {!loading && !options.length ? (
        <YStack paddingVertical={space.xl} alignItems="center" gap={space.md}>
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText part={null} tone="muted" align="center">
            {emptyLine(thing, lang)}
          </KitText>
        </YStack>
      ) : (
        <Drawing
          options={rows}
          {...(at === undefined || busy ? {} : { at })}
          angle={angle}
          loading={hidden}
        />
      )}
    </YStack>
  );
}
