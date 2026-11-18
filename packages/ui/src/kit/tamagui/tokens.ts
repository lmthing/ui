import { component, radius, size, space, zIndex } from "../../catalog";

export const kitTokens = {
  space: { ...space, true: space.md },
  size: { ...space, control: size.control.md, gallery: component.Gallery.cardWidth, true: size.control.md },
  radius: { ...radius, true: radius.md },
  zIndex: { ...zIndex, true: zIndex.base },
  color: {},
};
