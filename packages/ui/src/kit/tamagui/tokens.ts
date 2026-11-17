import { component, radius, size, space } from "../../catalog";

export const kitTokens = {
  space: { ...space, true: space.md },
  size: { ...space, control: size.control.md, gallery: component.Gallery.cardWidth, true: size.control.md },
  radius: { ...radius, true: radius.md },
  zIndex: { true: component.List.hidden },
  color: {},
};
