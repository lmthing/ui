import { XStack } from "tamagui";
import { presets, space, type ComponentName } from "@lmthing/ui/catalog";
import { cellKey, cellsOf, modes } from "./gallery-data";
import { Preview } from "./Preview";

export function VariantGrid({
  id,
  preset,
  mode,
  responsive = false,
}: {
  id: ComponentName;
  preset?: string | null;
  mode?: string | null;
  responsive?: boolean;
}) {
  return (
    <XStack flexWrap="wrap" gap={space.xl} testID={`variants_${id}`}>
      {presets
        .filter((item) => !preset || item.id === preset)
        .flatMap((item) =>
          modes
            .filter((value) => !mode || value === mode)
            .flatMap((value) =>
              cellsOf(id).map((cell) => (
                <Preview
                  key={`${item.id}_${value}_${cellKey(cell)}`}
                  cell={cell}
                  preset={item.id}
                  mode={value}
                  responsive={responsive}
                />
              )),
            ),
        )}
    </XStack>
  );
}
