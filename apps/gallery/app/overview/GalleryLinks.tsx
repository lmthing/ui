import { Text } from "tamagui";

export function GalleryLinks() {
  return (
    <>
      <Text tag="a" href="?nav-shell" color="$accent" fontSize="$label">
        Navigation shell
      </Text>
      <Text tag="a" href="?motion-lab=lively" color="$accent" fontSize="$label">
        Motion lab
      </Text>
      <Text tag="a" href="?flows" color="$accent" fontSize="$label">
        Flow templates
      </Text>
      <Text tag="a" href="?art-styles" color="$accent" fontSize="$label">
        Art styles
      </Text>
      <Text tag="a" href="?surfaces" color="$accent" fontSize="$label">
        Outside surfaces
      </Text>
    </>
  );
}
