import { numberLine, pluralForm } from "../../format";
import { localeOf, wordsFor } from "../../lang";
import { appointmentDate } from "..";

const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte", "petabyte"] as const;
const bytesPerUnit = 1000;

export function fileSizeLine(bytes: number, lang?: string): string {
  let value = bytes;
  let index = 0;
  while (value >= bytesPerUnit && index < units.length - 1) {
    value /= bytesPerUnit;
    index++;
  }
  return new Intl.NumberFormat(localeOf(lang), {
    style: "unit",
    unit: units[index],
    unitDisplay: "short",
    notation: value >= bytesPerUnit ? "scientific" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function filePagesLine(pages: number, lang?: string): string {
  return wordsFor(lang).fileList.pages(numberLine(pages, lang), pluralForm(pages, lang));
}

export function maskedPassId(memberId: string, lang?: string): string {
  const characters = Array.from(memberId);
  return wordsFor(lang).passCard.mask(characters.length > 4 ? characters.slice(-4).join("") : "");
}

export function passExpiryLine(date: string, lang?: string): string {
  return wordsFor(lang).passCard.expiry(appointmentDate(date, lang));
}
