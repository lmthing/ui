import { ScrollView, XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KeyButton, type KeyFinish } from "./PadKey";
import { useKeypadTarget } from "./use-keypad-target";

type Letter = {
  id: string;
  label: string;
  value: string;
  center?: boolean;
  state?: "unused" | "correct" | "present" | "absent";
  target: { item?: string; part: string };
};
type LetterProps = {
  part?: string;
  loading?: boolean;
  layout: "qwerty" | "hive";
  keys: readonly Letter[];
  disabled?: boolean;
};
type LayoutProps = Required<Pick<LetterProps, "keys" | "loading" | "disabled">>;
const finishes = {
  unused: "plain",
  correct: "correct",
  present: "present",
  absent: "absent",
} as const satisfies Record<NonNullable<Letter["state"]>, KeyFinish>;
const rowLengths = [10, 9, 7] as const;
const pitch = size.control.md + space.xs;
const hiveBox = component.base.ringLg + space.xl * 2;
const hiveCenter = (hiveBox - size.control.md) / 2;
const orbit = hiveCenter - space.sm;

export function letterRows(keys: LetterProps["keys"]) {
  const rows = [];
  let offset = 0;
  while (offset < keys.length) {
    const count = rowLengths[rows.length] ?? rowLengths[0];
    rows.push(keys.slice(offset, offset + count));
    offset += count;
  }
  return rows;
}

export function hivePositions(keys: LetterProps["keys"]) {
  const center = keys.findIndex((key) => key.center);
  const around = keys.length - Number(center >= 0);
  let outer = 0;
  return keys.map((key, index) => {
    if (index === center) return { key, x: 0, y: 0, center: true };
    const angle = (outer++ / around) * 2 * Math.PI;
    return { key, x: Math.sin(angle) * orbit, y: -Math.cos(angle) * orbit, center: false };
  });
}

function LetterButton({
  letter,
  loading,
  disabled,
  hive,
  center,
}: {
  letter: Letter;
  loading: boolean;
  disabled: boolean;
  hive?: boolean;
  center?: boolean;
}) {
  const kit = useKit();
  const address = useKeypadTarget(letter.target.part, !loading, disabled);
  const dispatch = () => {
    if (kit.controller?.actionsAt(address.testID).includes("type"))
      kit.controller.act({ address: address.testID, action: "type", value: letter.value });
    else kit.controller?.press(address.testID);
  };
  const finish =
    center && (!letter.state || letter.state === "unused") ? "accent" : finishes[letter.state ?? "unused"];
  return (
    <KeyButton
      label={letter.label}
      {...{ loading, disabled, finish }}
      round={hive}
      address={loading ? undefined : address}
      press={kit.interactive && kit.controller ? dispatch : undefined}
    />
  );
}

function LetterSlot({ letter, ...props }: Parameters<typeof LetterButton>[0]) {
  const scope = usePartContext();
  return (
    <PartContext.Provider value={{ ...scope, item: letter.target.item ?? letter.id }}>
      <LetterButton letter={letter} {...props} />
    </PartContext.Provider>
  );
}

function Qwerty({ keys, loading, disabled }: LayoutProps) {
  const rows = letterRows(keys);
  const width = Math.max(0, ...rows.map((row) => row.length * pitch - space.xs));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      scrollEnabled={!loading}
      contentContainerStyle={{ minWidth: "100%" }}
    >
      <YStack minWidth={width} flexGrow={1} gap={space.xs}>
        {rows.map((row, index) => (
          <XStack key={index} justifyContent="center" gap={space.xs}>
            {row.map((letter) => (
              <YStack key={letter.id} width={size.control.md} flexShrink={component.base.none}>
                <LetterSlot {...{ letter, loading, disabled }} />
              </YStack>
            ))}
          </XStack>
        ))}
      </YStack>
    </ScrollView>
  );
}

function Hive({ keys, loading, disabled }: LayoutProps) {
  return (
    <YStack width={hiveBox} height={hiveBox} alignSelf="center">
      {hivePositions(keys).map(({ key, x, y, center }) => (
        <YStack
          key={key.id}
          position="absolute"
          left={hiveCenter + x}
          top={hiveCenter + y}
          width={size.control.md}
        >
          <LetterSlot letter={key} hive {...{ loading, disabled, center }} />
        </YStack>
      ))}
    </YStack>
  );
}

/** Draws the supplied letter order and marks; the caller enforces puzzle rules. */
export function KitLetterKeys({
  part = "root",
  layout,
  keys,
  loading = false,
  disabled = false,
}: LetterProps) {
  const View = layout === "hive" ? Hive : Qwerty;
  const { item } = usePartContext();
  const separate = !keys.some((key) => (key.target.item ?? key.id) === item && key.target.part === part);
  const address = usePart(part, separate);
  return (
    <YStack {...(separate ? address : {})} minWidth={component.base.none} aria-busy={loading || undefined}>
      <View {...{ keys, loading, disabled }} />
    </YStack>
  );
}
