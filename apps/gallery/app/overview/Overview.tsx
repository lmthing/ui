import { useState } from "react";
import { Text, XStack, YStack } from "tamagui";
import { component, space, type ComponentName } from "@lmthing/ui/catalog";
import { registerGridThemes } from "../../index";
import { ComponentCard } from "./ComponentCard";
import { GalleryHeader } from "./GalleryHeader";
import { componentIds, groupAnchor, groupedIds } from "./gallery-data";

function ComponentGroup({
  group,
  anchor,
  ids,
  expanded,
  toggle,
}: {
  group: string;
  anchor: string;
  ids: ComponentName[];
  expanded: ReadonlySet<ComponentName>;
  toggle: (id: ComponentName) => void;
}) {
  return (
    <YStack gap={space.lg}>
      <YStack
        id={anchor}
        position="absolute"
        top={-component.Gallery.anchorOffset}
        height={component.base.none}
      />
      <Text
        tag="a"
        href={`#${anchor}`}
        accessibilityRole="header"
        fontFamily="$humanist"
        fontSize="$title"
        fontWeight="bold"
        color="$text"
        textTransform="capitalize"
        textDecorationLine="none"
      >
        {group}
      </Text>
      <XStack flexWrap="wrap" gap={space.xl} alignItems="flex-start">
        {ids.map((id) => (
          <ComponentCard key={id} id={id} expanded={expanded.has(id)} onToggle={() => toggle(id)} />
        ))}
      </XStack>
    </YStack>
  );
}

export function Overview() {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<ComponentName>>(new Set());
  const sections = groupedIds(filter, new URLSearchParams(globalThis.location?.search ?? ""));
  const toggle = (id: ComponentName) => {
    registerGridThemes();
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => {
    registerGridThemes();
    setExpanded(new Set(componentIds));
  };
  return (
    <YStack backgroundColor="$bg" minHeight="100vh" width="100%">
      <GalleryHeader
        filter={filter}
        onFilter={setFilter}
        onExpand={expandAll}
        onCollapse={() => setExpanded(new Set())}
      />
      <YStack
        tag="main"
        width="100%"
        maxWidth={component.Gallery.overviewMaxWidth}
        alignSelf="center"
        padding={space.lg}
        gap={space["2xl"]}
      >
        {sections.map((section) => {
          const anchor = groupAnchor(section);
          return (
            <ComponentGroup
              key={anchor}
              anchor={anchor}
              group={section.group}
              ids={section.ids}
              expanded={expanded}
              toggle={toggle}
            />
          );
        })}
        {!sections.length && (
          <Text fontFamily="$humanist" color="$muted" fontSize="$body">
            No components match this filter.
          </Text>
        )}
      </YStack>
    </YStack>
  );
}
