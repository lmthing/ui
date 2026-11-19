import { Button, Text, XStack, YStack } from "tamagui";
import { component, components, presets, radius, size, space, type ComponentName } from "@lmthing/ui/catalog";
import { cellsOf, variantCount } from "./gallery-data";
import { Preview } from "./Preview";
import { VariantGrid } from "./VariantGrid";
import { SharedVariants } from "./SharedVariants";

const buttonProps = {
  minHeight: size.control.md,
  fontSize: "$label",
  backgroundColor: "$raised",
  color: "$text",
  borderColor: "$line",
  fontFamily: "$humanist",
} as const;

function ComponentActions({
  id,
  expanded,
  onToggle,
}: {
  id: ComponentName;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <XStack gap={space.sm} flexWrap="wrap">
      <Button flexGrow={component.base.bodyFlex} {...buttonProps} aria-expanded={expanded} onPress={onToggle}>
        {expanded ? "Hide variants" : `Show all ${variantCount(id)} variants`}
      </Button>
      <Button
        onPress={() => globalThis.location.assign(`?c=${id}`)}
        {...buttonProps}
        aria-label={`Open ${id} full grid`}
      >
        Open
      </Button>
    </XStack>
  );
}

export function ComponentTitle({ id }: { id: ComponentName }) {
  const meta = components[id]?.meta;
  if (!meta) return null;
  return (
    <YStack gap={space.xs} minWidth={component.base.none} testID={`title_${id}`}>
      <XStack gap={space.sm} alignItems="center" flexWrap="wrap">
        <Text
          accessibilityRole="header"
          fontFamily="$humanist"
          fontSize="$heading"
          fontWeight="bold"
          color="$text"
        >
          {meta.id}
        </Text>
        <Text fontFamily="$humanist" fontSize="$caption" color="$muted">
          {meta.group}
        </Text>
        <Text fontFamily="$humanist" fontSize="$caption" color="$muted">
          {meta.tier}
        </Text>
      </XStack>
      <Text
        fontFamily="$humanist"
        fontSize="$body"
        color="$muted"
        numberOfLines={1}
        accessibilityLabel={meta.purpose}
      >
        {meta.purpose}
      </Text>
    </YStack>
  );
}

export function ComponentCard({
  id,
  expanded,
  onToggle,
}: {
  id: ComponentName;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <YStack
      testID={`component_${id}`}
      width="100%"
      flexBasis={expanded ? "100%" : component.Gallery.cardWidth}
      flexGrow={component.base.none}
      flexShrink={component.base.bodyFlex}
      maxWidth="100%"
      minWidth={component.base.none}
      padding={space.lg}
      gap={space.lg}
      borderWidth={component.base.borderWidth}
      borderColor="$line"
      borderRadius={radius.lg}
      backgroundColor="$surface"
    >
      <ComponentTitle id={id} />
      {expanded && <ComponentActions id={id} expanded={expanded} onToggle={onToggle} />}
      {expanded ? (
        <>
          <SharedVariants id={id} />
          <VariantGrid id={id} responsive />
        </>
      ) : (
        <Preview cell={cellsOf(id)[0]!} preset={presets[0]!.id} mode="light" responsive label={false} />
      )}
      {!expanded && <ComponentActions id={id} expanded={expanded} onToggle={onToggle} />}
    </YStack>
  );
}
