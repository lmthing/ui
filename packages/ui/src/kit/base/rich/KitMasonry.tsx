import { useState, type ReactNode } from "react";
import { YStack } from "tamagui";
import { component, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { shifted } from "../text";
import { RichEmpty, safeRatio, type Drawing } from "./rich-drawing";

type Tile = { id: string; ratio: number; children: ReactNode };
type MasonryProps = Drawing & { columns?: 2; items: readonly Tile[] };
const placeholders: readonly Tile[] = [
  { id: "first", ratio: component.base.tallRatio, children: null },
  { id: "second", ratio: component.base.wideRatio, children: null },
  { id: "third", ratio: 1, children: null },
];

function layout(items: readonly Tile[], width: number, gap: number, columns: 2) {
  const columnWidth = Math.max(0, (width - gap * (columns - 1)) / columns);
  const bottoms = [0, 0];
  const tiles = items.map((tile) => {
    const column = bottoms[0]! <= bottoms[1]! ? 0 : 1;
    const y = bottoms[column]!;
    const height = columnWidth / safeRatio(tile.ratio);
    bottoms[column] = y + height + gap;
    return { tile, y, height, x: column * (columnWidth + gap) };
  });
  return { tiles, columnWidth, height: Math.max(0, Math.max(...bottoms) - gap) };
}

/** Place each card in the shorter column, while keeping source order for focus and reading. */
export function KitMasonry({ part = "root", loading, columns = 2, items }: MasonryProps) {
  const context = usePartContext();
  const ks = useKitStyle();
  const { loadingLabel } = useWords().words;
  const [width, setWidth] = useState(0);
  const address = usePart(part);
  const busy = loading || context.state === "loading";
  const rows = busy && !items.length ? placeholders : items;
  const empty = !busy && (context.state === "empty" || !rows.length);
  const { tiles, columnWidth, height } = layout(rows, width, space[ks.density.gap], columns);
  return (
    <YStack
      {...address}
      width="100%"
      minWidth={component.base.none}
      onLayout={(event) => {
        address.onLayout();
        setWidth(event.nativeEvent.layout.width);
      }}
      aria-busy={busy || undefined}
      accessibilityLabel={busy ? loadingLabel : undefined}
      accessibilityRole={!busy && !empty ? "list" : undefined}
    >
      {empty ? (
        <RichEmpty />
      ) : (
        <YStack height={height} aria-hidden={busy || undefined} accessibilityElementsHidden={busy}>
          {width > 0 &&
            tiles.map(({ tile, x, y, height: tileHeight }) => (
              <YStack
                key={tile.id}
                position="absolute"
                left={x}
                top={y}
                width={columnWidth}
                height={tileHeight}
                accessibilityRole={busy ? undefined : "listitem"}
                {...(busy ? { backgroundColor: "$line", borderRadius: shifted("md", ks.radiusShift) } : {})}
              >
                {!busy && (
                  <PartContext.Provider value={{ ...context, item: tile.id }}>
                    {tile.children}
                  </PartContext.Provider>
                )}
              </YStack>
            ))}
        </YStack>
      )}
    </YStack>
  );
}
