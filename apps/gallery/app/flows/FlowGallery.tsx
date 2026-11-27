import { useState } from "react";
import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import {
  component,
  flowTemplates,
  radius,
  space,
  themeName,
  type FlowTemplateSource,
} from "@lmthing/ui/catalog";
import { config } from "../../index";
import { FlowControl, FlowPlayer } from "./FlowPlayer";
import { flowTheme } from "./FlowPhone";
import { flowWords, readableId } from "./flow-copy";

function FlowTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <YStack gap={space.xs}>
      <Text tag="h1" color="$text" fontSize="$heading" fontWeight="700" margin={0}>
        {title}
      </Text>
      <Text color="$muted" fontSize="$body">
        {detail}
      </Text>
    </YStack>
  );
}

function FlowMenu() {
  return (
    <YStack gap={space.lg}>
      <FlowTitle title={flowWords.title} detail={flowWords.intro} />
      <YStack gap={space.sm}>
        {flowTemplates.list.map(({ id, title, purpose }) => (
          <Text key={id} tag="a" href={`?flows=${id}`} display="block" textDecorationLine="none">
            <YStack
              backgroundColor="$surface"
              borderColor="$line"
              borderWidth={component.base.borderWidth}
              borderRadius={radius.md}
              padding={space.md}
              gap={space.xs}
            >
              <Text color="$text" fontSize="$body" fontWeight="700">
                {title}
              </Text>
              <Text color="$muted" fontSize="$label">
                {purpose}
              </Text>
            </YStack>
          </Text>
        ))}
      </YStack>
    </YStack>
  );
}

function FlowDetail({ template }: { template: FlowTemplateSource }) {
  const [example, setExample] = useState(0);
  const sample = template.examples[example]!;
  return (
    <YStack gap={space.md}>
      <FlowTitle title={template.title ?? readableId(template.id)} detail={template.purpose} />
      <XStack gap={space.xs} flexWrap="wrap" accessibilityLabel={flowWords.example} role="group">
        {template.examples.map((value, i) => (
          <FlowControl key={value.id} active={i === example} onPress={() => setExample(i)}>
            {readableId(value.id)}
          </FlowControl>
        ))}
      </XStack>
      <FlowPlayer key={sample.id} template={template} example={sample} />
    </YStack>
  );
}

export function FlowGallery({ id }: { id: string }) {
  const template = id ? flowTemplates.get(id) : undefined;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(flowTheme)}>
      <YStack minHeight="100vh" backgroundColor="$bg" paddingVertical={space.lg} paddingHorizontal={space.md}>
        <YStack width="100%" maxWidth={component.Gallery.flowWidth} alignSelf="center" gap={space.md}>
          <Text tag="a" href={id ? "?flows" : "./"} color="$accent" fontSize="$label">
            {id ? flowWords.all : flowWords.gallery}
          </Text>
          {template ? (
            <FlowDetail template={template} />
          ) : id ? (
            <FlowTitle title={flowWords.title} detail={flowWords.missing} />
          ) : (
            <FlowMenu />
          )}
        </YStack>
      </YStack>
    </TamaguiProvider>
  );
}
