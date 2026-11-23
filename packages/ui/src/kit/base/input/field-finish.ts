import { component, type KitStyle } from "../../../catalog";

/** Field chrome never changes the editable part or its touch target. */
export function fieldFinish(treatment: KitStyle["frame"]["field"], loading = false, inactive = false) {
  const ruled = treatment === "ruled";
  return {
    backgroundColor: loading
      ? "$line"
      : ruled
        ? "transparent"
        : inactive || treatment === "outlined"
          ? "$surface"
          : "$raised",
    borderColor: "$line",
    borderWidth: ruled ? component.base.none : component.base.borderWidth,
    ...(ruled ? { borderBottomWidth: component.base.borderWidth } : {}),
  } as const;
}
