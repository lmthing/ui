import { Text, XStack, YStack } from "tamagui";
import { components, space, type ComponentName } from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { variantLabel, variantPreviews, variantSheet } from "../../../../packages/ui/scripts/variants";
import { Preview } from "./Preview";

const panelTitle = "Shared variants";

export function SharedVariants({ id, sheet = false }: { id: ComponentName; sheet?: boolean }) {
  const def = components[id];
  const ready = def && Object.hasOwn(renderers, id);
  const cases = ready ? variantPreviews(def) : [];
  if (!sheet && !cases.length) return null;
  return (
    <YStack
      padding={sheet ? space.lg : undefined}
      gap={space.md}
      backgroundColor={sheet ? "$bg" : undefined}
      {...(sheet ? { "data-look-variants": true } : { testID: `shared_variants_${id}` })}
    >
      {cases.length > 0 && (
        <Text accessibilityRole="header" color="$text" fontSize="$heading" fontWeight="bold">
          {panelTitle}
        </Text>
      )}
      <XStack flexWrap="wrap" alignItems="flex-start" gap={space.xl}>
        {cases.map((choice, index) => (
          <Preview
            key={variantLabel(choice)}
            cell={{ id, example: choice.input, state: "filled", index }}
            preset={variantSheet.preset}
            mode={variantSheet.mode}
            responsive={!sheet}
            variant={{ label: variantLabel(choice), index, sheet }}
          />
        ))}
      </XStack>
    </YStack>
  );
}
