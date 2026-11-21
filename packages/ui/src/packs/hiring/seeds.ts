import {
  clip,
  detailOf,
  itemsOf,
  placeholderDetail,
  placeholderTitle,
  thingOf,
  titleOf,
  type FallbackInput,
} from "../../catalog";

export const activeStages = ["applied", "screening", "interview", "offer"] as const;
export const outcomes = ["active", "hired", "rejected", "withdrawn"] as const;
export const payPeriods = ["hour", "month", "year"] as const;

export const seedDate = "2026-11-20";
export const seedTime = "09:00";
export const seedJobId = "job_1";
export const seedApplicationId = "application_1";
export const seedGoto = "details";

export function seedRows({ cast, lang }: FallbackInput, count: number) {
  const thing = thingOf(cast);
  const rows = itemsOf(cast, count);
  return (rows.length ? rows : [undefined]).map((item, i) => ({
    title: (max: number) => (item && titleOf(item, max, thing)) ?? clip(placeholderTitle(i, lang), max),
    detail: (max: number) => (item && detailOf(item, max, thing)) ?? clip(placeholderDetail, max),
  }));
}
