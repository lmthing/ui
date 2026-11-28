import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import {
  artStyle,
  artStyles,
  defaultArtStyle,
  size,
  space,
  themeName,
  type ArtStyle,
} from "@lmthing/ui/catalog";
import { KitPhoto, KitProvider, KitText, PartScope, PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../index";
import {
  artStyleHeight,
  artStyleIcon,
  artStyleScreen,
  artStyleTheme,
  artStyleTitle,
  artStyleWidth,
} from "./art-style-fixture";

const labels = {
  natural_photo: "Natural photo",
  studio_photo: "Studio photo",
  soft_3d: "Soft 3D",
  flat_illustration: "Flat illustration",
  line_art: "Line art",
  risograph: "Risograph",
  watercolor: "Watercolor",
  paper_cut: "Paper cut",
} satisfies Record<ArtStyle, string>;

function ArtStylePicker({ selected }: { selected: ArtStyle }) {
  return (
    <YStack tag="nav" aria-label="Art styles" gap={space.sm}>
      <Text fontSize="$heading" color="$text">
        Art styles
      </Text>
      <XStack flexWrap="wrap" gap={space.xs}>
        {artStyles.map((style) => (
          <Text
            key={style}
            tag="a"
            href={`?art-styles=${style}`}
            aria-current={style === selected ? "page" : undefined}
            color={style === selected ? "$text" : "$accent"}
            fontWeight={style === selected ? "700" : "500"}
            fontSize="$label"
            display="flex"
            alignItems="center"
            minHeight={size.control.md}
            padding={space.sm}
          >
            {labels[style]}
          </Text>
        ))}
      </XStack>
    </YStack>
  );
}

function ArtStyleApp({ style }: { style: ArtStyle }) {
  const theme = { ...artStyleTheme, artStyle: style };
  const resolveImage = (address: string) => `./art-styles/${style}-${address.split("/")[1]}.jpg`;
  return (
    <YStack width="100%" maxWidth={artStyleWidth} data-art-style={style} data-look-frame={`ledge-${style}`}>
      <KitProvider theme={theme} resolveImage={resolveImage}>
        <PartScope screen={artStyleScreen.id} component="icon" rev={1} state="filled">
          <XStack
            alignItems="center"
            gap={space.md}
            paddingHorizontal={space.gutter}
            paddingVertical={space.md}
          >
            <KitPhoto part="photo" photo={artStyleIcon} decorative />
            <KitText role="heading" part={null}>
              {artStyleTitle}
            </KitText>
          </XStack>
        </PartScope>
      </KitProvider>
      <YStack height={artStyleHeight}>
        <PhoneScreen screen={artStyleScreen} theme={theme} resolveImage={resolveImage} interactive={false} />
      </YStack>
    </YStack>
  );
}

export function ArtStyles({ name, preview }: { name: string | null; preview: boolean }) {
  const style = artStyle.safeParse(name).data ?? defaultArtStyle;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(artStyleTheme)}>
      <YStack maxWidth={artStyleWidth} width="100%" alignSelf="center" backgroundColor="$bg">
        {!preview && <ArtStylePicker selected={style} />}
        <ArtStyleApp style={style} />
      </YStack>
    </TamaguiProvider>
  );
}
