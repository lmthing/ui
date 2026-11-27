import { Button, Input, Text, XStack, YStack } from "tamagui";
import { component, size, space } from "@lmthing/ui/catalog";
import { componentIds } from "./gallery-data";
import { GalleryLinks } from "./GalleryLinks";

const buttonProps = {
  minHeight: size.control.md,
  fontSize: "$label",
  backgroundColor: "$raised",
  color: "$text",
  borderColor: "$line",
  fontFamily: "$humanist",
} as const;

function HeaderActions({ onExpand, onCollapse }: { onExpand: () => void; onCollapse: () => void }) {
  return (
    <XStack gap={space.sm}>
      <Button {...buttonProps} onPress={onExpand}>
        Expand all
      </Button>
      <Button {...buttonProps} onPress={onCollapse}>
        Collapse all
      </Button>
    </XStack>
  );
}

function GalleryBrand() {
  return (
    <YStack>
      <Text fontFamily="$humanist" fontSize="$heading" fontWeight="bold" color="$text">
        UI gallery
      </Text>
      <Text
        fontFamily="$humanist"
        fontSize="$caption"
        color="$muted"
      >{`${componentIds.length} components`}</Text>
    </YStack>
  );
}

export function GalleryHeader({
  filter,
  onFilter,
  onExpand,
  onCollapse,
}: {
  filter: string;
  onFilter: (value: string) => void;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  return (
    <YStack
      tag="header"
      // Web-only CSS position; Tamagui's shared native type omits sticky.
      position={"sticky" as "relative"}
      top={component.base.none}
      zIndex={component.Gallery.headerLayer}
      backgroundColor="$surface"
      borderBottomWidth={component.base.borderWidth}
      borderColor="$line"
    >
      <XStack
        width="100%"
        maxWidth={component.Gallery.overviewMaxWidth}
        alignSelf="center"
        padding={space.lg}
        gap={space.md}
        alignItems="center"
        flexWrap="wrap"
      >
        <GalleryBrand />
        <GalleryLinks />
        <Input
          value={filter}
          onChangeText={onFilter}
          placeholder="Filter by id or purpose"
          aria-label="Filter components"
          width={component.Gallery.filterWidth}
          maxWidth="100%"
          flexGrow={component.base.bodyFlex}
          minHeight={size.control.md}
          fontSize="$label"
          fontFamily="$humanist"
          color="$text"
          backgroundColor="$bg"
          borderColor="$line"
        />
        <HeaderActions onExpand={onExpand} onCollapse={onCollapse} />
      </XStack>
    </YStack>
  );
}
