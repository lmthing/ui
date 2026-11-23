import { useContext } from "react";
import { component, fontFamilies, type KitStyle, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { CardStyleContext } from "../text";

export const isRuledField = (field: KitStyle["frame"]["field"]) => field === "ruled" || field === "serifRule";

export function fieldType({ fonts, frame }: KitStyle) {
  const display = frame.field === "serifRule";
  return {
    fontFamily: fontFamilies[display ? fonts.heading : fonts.text],
    ...(display ? { fontWeight: typography.heading.weight } : {}),
  };
}

/** Field chrome never changes the editable part or its touch target. */
export function fieldFinish(
  treatment: KitStyle["frame"]["field"],
  loading = false,
  inactive = false,
  raisedCard = false,
) {
  const ruled = isRuledField(treatment);
  return {
    backgroundColor: loading
      ? "$line"
      : inactive
        ? "$surface"
        : ruled
          ? "transparent"
          : raisedCard || treatment === "outlined" || treatment === "ink"
            ? "$surface"
            : "$raised",
    borderColor: ruled ? "$muted" : treatment === "ink" ? "$text" : "$line",
    borderWidth: ruled ? component.base.none : component.base.borderWidth,
    ...(ruled ? { borderBottomWidth: component.base.borderWidth } : {}),
  } as const;
}

export function useFieldFinish(loading?: boolean, inactive?: boolean) {
  const { frame, surface } = useKitStyle();
  const card = useContext(CardStyleContext);
  return fieldFinish(
    frame.field,
    loading,
    inactive,
    card === "inset" && (surface === "raised" || surface === "tinted"),
  );
}
