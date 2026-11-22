export type SeatState = "free" | "taken" | "selected";

export const seatFill = {
  free: "$surface",
  taken: "$raised",
  selected: "$accentSoft",
  loading: "$line",
} as const;
