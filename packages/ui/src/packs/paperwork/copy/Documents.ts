import { appointmentDate, numberLine, pluralForm, wordsFor } from "../../../catalog";
import { paperworkWordsFor, type PaperworkWords } from "../lang";

type DocumentDetails = {
  kind: keyof PaperworkWords["documents"]["kinds"];
  issuer?: string | undefined;
  number?: string | undefined;
  issued?: string | undefined;
  expires?: string | undefined;
  file?: string | undefined;
  folder?: string | undefined;
  pages?: number | undefined;
  tags: readonly string[];
};

type Detail = {
  part:
    "kind" | "issuer" | "number" | "issued" | "expires" | "file" | "tags" | "warning" | "folder" | "pages";
  line: string;
  tone?: "warn" | "bad";
};
const dayMs = 86_400_000;
const warningDays = 30;

function expiryWarning(expires: string, now: Date, lang?: string): Detail[] {
  const words = paperworkWordsFor(lang).documents;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = (Date.parse(expires) - today) / dayMs;
  if (days > warningDays) return [];
  const duration = wordsFor(lang).days(numberLine(days, lang), pluralForm(days, lang));
  return [
    {
      part: "warning",
      line: days < 0 ? words.expired : days === 0 ? words.expiresToday : words.expiresIn(duration),
      tone: days < 0 ? "bad" : "warn",
    },
  ];
}

export function documentDetails(row: DocumentDetails, now: Date, lang?: string): Detail[] {
  const words = paperworkWordsFor(lang).documents;
  const lines: Detail[] = [{ part: "kind", line: words.kinds[row.kind] }];
  if (row.issuer) lines.push({ part: "issuer", line: row.issuer });
  if (row.number) lines.push({ part: "number", line: words.masked });
  if (row.issued) lines.push({ part: "issued", line: words.issued(appointmentDate(row.issued, lang)) });
  if (row.expires) {
    lines.push({ part: "expires", line: words.expires(appointmentDate(row.expires, lang)) });
    lines.push(...expiryWarning(row.expires, now, lang));
  }
  if (row.file) lines.push({ part: "file", line: words.privateFile });
  if (row.tags.length) lines.push({ part: "tags", line: row.tags.join(words.separator) });
  if (row.folder) lines.push({ part: "folder", line: row.folder });
  if (row.pages !== undefined)
    lines.push({
      part: "pages",
      line: words.pages(numberLine(row.pages, lang), pluralForm(row.pages, lang)),
    });
  return lines;
}

export function documentFolders<Row extends { folder?: string | undefined }>(rows: readonly Row[]) {
  const folders = new Map<string | undefined, Row[]>();
  for (const row of rows) {
    const files = folders.get(row.folder);
    if (files) files.push(row);
    else folders.set(row.folder, [row]);
  }
  const unfiled = folders.get(undefined);
  if (unfiled) {
    folders.delete(undefined);
    folders.set(undefined, unfiled);
  }
  return [...folders];
}

export function documentReading(row: DocumentDetails, now: Date, lang?: string): string[] {
  const words = paperworkWordsFor(lang).documents;
  const reading = documentDetails(row, now, lang).map(({ part, line }) => {
    const joined = part === "kind" || (part === "number" && row.issuer) || (part === "tags" && row.file);
    return `${joined ? words.separator.trimStart() : ""}${line}`;
  });
  if (row.file) reading.push(words.attached);
  return reading;
}
