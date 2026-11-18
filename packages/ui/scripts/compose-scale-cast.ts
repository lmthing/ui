import type { CastLike } from "@lmthing/ui/catalog";
import { compositionCast } from "./compose-casts";

/** The scale probe needs one metric shared by today's editable rating and its recorded history. */
export function compositionScaleCast(id: string, layout: string): CastLike {
  if (id !== "tracker" || layout !== "scale") return compositionCast(id, layout);
  return {
    things: [{ type: "check_in", fields: ["label", "day", "value", "unit"] }],
    items: [
      {
        id: "today",
        type: "check_in",
        sample: true,
        label: "Daily mood",
        day: "Today",
        value: 3,
        unit: "rating",
      },
      {
        id: "mon",
        type: "check_in",
        sample: true,
        label: "Daily mood",
        day: "Mon",
        value: 2,
        unit: "rating",
      },
      {
        id: "tue",
        type: "check_in",
        sample: true,
        label: "Daily mood",
        day: "Tue",
        value: 4,
        unit: "rating",
      },
      {
        id: "wed",
        type: "check_in",
        sample: true,
        label: "Daily mood",
        day: "Wed",
        value: 3,
        unit: "rating",
      },
    ],
  };
}
