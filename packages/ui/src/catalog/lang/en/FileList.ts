import type { LDMLPluralRule } from "../plural";

export const words = {
  fileList: {
    error: "Attachments can’t be recovered here",
    format: { pdf: "PDF", doc: "DOC", sheet: "XLS", zip: "ZIP", audio: "AUD", other: "File" },
    pages: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "page" : "pages"}`,
    status: {
      ready: "",
      downloading: "Downloading",
      missing: "No longer available",
      uploading: "Uploading",
      failed: "Upload failed",
    },
    download: (name: string) => `Download ${name}`,
    remove: (name: string) => `Remove ${name}`,
    separator: " · ",
  },
};
