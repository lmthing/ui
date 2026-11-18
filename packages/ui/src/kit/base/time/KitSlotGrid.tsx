import { YStack, XStack } from "tamagui";
import { Clock } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext, useEmptyThing } from "../../part";
import { KitText, shifted } from "../text";

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

function SlotItem({
  slot,
  selected,
  list,
  loading,
}: {
  slot: Slot;
  selected: boolean;
  list: boolean;
  loading: boolean;
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
      gap={space.md}
      alignItems="center"
      justifyContent={list ? "space-between" : "center"}
      borderRadius={list ? shifted("md", ks.radiusShift) : radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={selected ? "$accent" : slot.taken ? "$line" : "$muted"}
      backgroundColor={loading ? "$line" : selected ? "$accentSoft" : slot.taken ? "$raised" : "$surface"}
      {...(list ? { width: "100%" as const } : {})}
    >
      <YStack opacity={loading ? component.base.none : 1}>
        <KitText role="label" tone={slot.taken ? "muted" : selected ? "accent" : "text"} tabular part={null}>
          {slot.label}
        </KitText>
      </YStack>
      {slot.sub && (
        <YStack opacity={loading ? component.base.none : 1}>
          <KitText role="caption" tone="muted" tabular part={null}>
            {slot.sub}
          </KitText>
        </YStack>
      )}
    </XStack>
  );
}

/** Wrapping slots or end-time rows. Taken slots stay readable; loading retains geometry without targets. */
export function KitSlotGrid({ part = "root", loading = false, times, at, style = "grid" }: SlotGridProps) {
  const context = usePartContext();
  const address = usePart(part);
  const thing = useEmptyThing();
  const list = style === "list";
  const slots =
    loading && !times.length
      ? Array.from({ length: 3 }, (_, id) => ({
          id: String(id),
          label: "\u2007\u2007:\u2007\u2007",
          taken: false,
        }))
      : times;
  return (
    <XStack
      {...address}
      flexDirection={list ? "column" : "row"}
      flexWrap={list ? "nowrap" : "wrap"}
      gap={space.sm}
      aria-busy={loading}
    >
      {slots.length ? (
        slots.map((slot) => (
          <PartContext.Provider key={slot.id} value={{ ...context, item: slot.id }}>
            <SlotItem slot={slot} selected={at === slot.id} list={list} loading={loading} />
          </PartContext.Provider>
        ))
      ) : (
        <YStack width="100%" alignItems="center" gap={space.md} padding={space.xl}>
          <Clock size={size.icon.lg} color="$muted" aria-hidden />
          <KitText tone="muted" align="center" part={null}>
            {emptyLine(thing)}
          </KitText>
        </YStack>
      )}
    </XStack>
  );
}
