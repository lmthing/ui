import { useWords } from "../../provider";
import { YStack, XStack } from "tamagui";
import { Clock } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext, useEmptyThing } from "../../part";
import { KitText, shifted } from "../text";
import { useState } from "react";

type Slot = { id: string; label: string; sub?: string; taken: boolean };
type SlotGridProps = {
  part?: string;
  loading?: boolean;
  times: readonly Slot[];
  at?: string;
  style?: "grid" | "list";
};

function useSlotTarget(slot: Slot, selected: boolean, loading: boolean) {
  const kit = useKit();
  const address = usePart("root", !loading);
  const select = () => kit.controller?.act({ address: address.testID, action: "select" });
  return loading
    ? { "aria-hidden": true }
    : {
        ...address,
        accessibilityRole: "button",
        accessibilityLabel: slot.sub ? `${slot.label}, ${slot.sub}` : slot.label,
        "aria-pressed": selected,
        "aria-disabled": slot.taken,
        disabled: slot.taken,
        focusable: !slot.taken,
        ...(kit.interactive && kit.controller && !slot.taken
          ? {
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
}

function SlotLine({
  children,
  loading,
  value = false,
}: {
  children: React.ReactNode;
  loading: boolean;
  value?: boolean;
}) {
  const height = value ? space.sm : space.xs;
  return (
    <YStack minWidth={component.base.none} flexShrink={component.base.bodyFlex} alignItems="center">
      {loading ? (
        <YStack opacity={component.base.none} aria-hidden>
          {children}
        </YStack>
      ) : (
        children
      )}
      {loading && (
        <YStack
          position="absolute"
          top="50%"
          marginTop={-height / 2}
          width="100%"
          height={height}
          backgroundColor="$line"
          borderRadius={radius.pill}
        />
      )}
    </YStack>
  );
}

function SlotItem({
  slot,
  selected,
  list,
  loading,
  width,
}: {
  slot: Slot;
  selected: boolean;
  list: boolean;
  loading: boolean;
  width: number;
}) {
  const ks = useKitStyle();
  const target = useSlotTarget(slot, selected, loading);
  return (
    <XStack
      {...(target as object)}
      minHeight={size.control.md}
      minWidth={size.control.md}
      paddingHorizontal={space.md}
      paddingVertical={space.sm}
      gap={list ? space.md : space.xs}
      flexDirection={list ? "row" : "column"}
      alignItems="center"
      justifyContent={list ? "space-between" : "center"}
      borderRadius={list ? shifted("md", ks.radiusShift) : radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={!loading && selected ? "$accent" : "$line"}
      backgroundColor={loading ? "$surface" : selected ? "$accentSoft" : slot.taken ? "$raised" : "$surface"}
      width={list ? "100%" : width ? (width - space.sm * 2) / 3 : "30%"}
    >
      <SlotLine loading={loading} value>
        <KitText
          role="number"
          numberScale="compact"
          tone={slot.taken ? "muted" : selected ? "accent" : "text"}
          tabular
          part={loading ? null : "time"}
        >
          {slot.label}
        </KitText>
      </SlotLine>
      {slot.sub && (
        <SlotLine loading={loading}>
          <KitText role="caption" tone="muted" part={null}>
            {slot.sub}
          </KitText>
        </SlotLine>
      )}
    </XStack>
  );
}

/** Wrapping slots or end-time rows. Taken slots stay readable; loading retains geometry without targets. */
export function KitSlotGrid({ part = "root", loading = false, times, at, style = "grid" }: SlotGridProps) {
  const { lang } = useWords();

  const context = usePartContext();
  const address = usePart(part);
  const thing = useEmptyThing();
  const list = style === "list";
  const [width, setWidth] = useState(0);
  const slots =
    loading && !times.length
      ? Array.from({ length: 3 }, (_, id) => ({
          id: `r${id + 1}`,
          label: "\u2007\u2007:\u2007\u2007",
          taken: false,
        }))
      : times;
  return (
    <XStack
      {...address}
      onLayout={(event) => {
        address.onLayout();
        setWidth(event.nativeEvent.layout.width);
      }}
      flexDirection={list ? "column" : "row"}
      flexWrap={list ? "nowrap" : "wrap"}
      gap={space.sm}
      aria-busy={loading}
    >
      {slots.length ? (
        slots.map((slot) => (
          <PartContext.Provider key={slot.id} value={{ ...context, item: slot.id }}>
            <SlotItem slot={slot} selected={at === slot.id} list={list} loading={loading} width={width} />
          </PartContext.Provider>
        ))
      ) : (
        <YStack width="100%" alignItems="center" gap={space.md} padding={space.xl}>
          <Clock size={size.icon.lg} color="$muted" aria-hidden />
          <KitText tone="muted" align="center" part={null}>
            {emptyLine(thing, lang)}
          </KitText>
        </YStack>
      )}
    </XStack>
  );
}
