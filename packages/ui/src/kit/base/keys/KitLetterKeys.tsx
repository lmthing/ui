import { ScrollView, XStack, YStack, isWeb } from "tamagui";
import { component, formatAddress, parseAddress, size, space } from "../../../catalog";
import { PartContext, usePartContext } from "../../part";
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
  const rows: (readonly Letter[])[] = [];
  let offset = 0;
  while (offset < keys.length) {
    const count = rowLengths[rows.length] ?? rowLengths[0];
    rows.push(keys.slice(offset, offset + count));
    offset += count;
  }
  return rows;
}

function letterItem(letter: Letter, scope: ReturnType<typeof usePartContext>) {
  const { id, target } = letter;
  const inferred = parseAddress(`${scope.screen}/${scope.component}/${id}/${target.part}`);
  return target.item ?? (inferred?.item === id ? id : scope.item);
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
  const controller = kit.interactive ? kit.controller : undefined;
  const inactive =
    disabled ||
    Boolean(
      controller &&
      !loading &&
      !controller.actionsAt(address.testID, { ignoreDisabledPart: true }).includes("press"),
    );
  const finish =
    center && (!letter.state || letter.state === "unused") ? "accent" : finishes[letter.state ?? "unused"];
  return (
    <KeyButton
      label={letter.label}
      glyph={letter.value}
      {...{ loading, finish }}
      disabled={inactive}
      round={hive}
      address={loading ? undefined : address}
      press={controller ? () => void controller.act({ address: address.testID, action: "press" }) : undefined}
    />
  );
}

function LetterSlot({ letter, ...props }: Parameters<typeof LetterButton>[0]) {
  const scope = usePartContext();
  const item = letterItem(letter, scope);
  return (
    <PartContext.Provider value={item === undefined || item === scope.item ? scope : { ...scope, item }}>
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
  const scope = usePartContext();
  const { controller, interactive, lang } = useKit();
  const coincident = keys.some((key) => letterItem(key, scope) === scope.item && key.target.part === part);
  const stampRoot = loading || !coincident;
  const address = useKeypadTarget(part, stampRoot, loading && coincident);
  const onKeyDown = (event: { key?: string; preventDefault(): void; stopPropagation(): void }) => {
    const input = event.key?.toLocaleLowerCase(lang);
    const hit = keys.find((key) => key.value.toLocaleLowerCase(lang) === input);
    if (!hit) return;
    const item = letterItem(hit, scope);
    const target = formatAddress({
      ...scope,
      ...(item !== undefined ? { item } : {}),
      part: hit.target.part,
    });
    if (!controller?.actionsAt(target).includes("press")) return;
    event.preventDefault();
    event.stopPropagation();
    controller.act({ address: target, action: "press" });
  };
  return (
    <YStack
      {...(stampRoot ? address : {})}
      minWidth={component.base.none}
      aria-busy={loading || undefined}
      {...(isWeb && interactive && controller && !loading && !disabled ? { onKeyDown } : {})}
    >
      <View {...{ keys, loading, disabled }} />
    </YStack>
  );
}
