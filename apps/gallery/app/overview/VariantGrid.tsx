import { XStack } from "tamagui";
import { space, type ComponentName } from "@lmthing/ui/catalog";
import { gridThemes } from "../../index";
import { cellKey, cellsOf } from "./gallery-data";
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
  const cells = cellsOf(id);
  return (
    <XStack flexWrap="wrap" gap={space.xl} testID={`variants_${id}`}>
      {gridThemes(preset, mode).flatMap(({ preset, mode }) =>
        cells.map((cell) => (
          <Preview
            key={`${preset}_${mode}_${cellKey(cell)}`}
            cell={cell}
            preset={preset}
            mode={mode}
            responsive={responsive}
          />
        )),
      )}
    </XStack>
  );
}
