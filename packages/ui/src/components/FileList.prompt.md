## Purpose

Show attached files and let people preview, download, or remove them.

## Pick

One to six non-image file attachments with names, formats and sizes, for example PDFs, contracts, spreadsheets, ZIPs or audio files. Not photos (Gallery or Photo), general list records (List), a file explorer (DriveTree or FileBrowser), or an ID vault (Documents).

## Writer

- Use only the supplied opaque fileRef, never a download URL or device path. Give sizeBytes in bytes. Use status "ready" for available demo or attached files; use "downloading" or "missing" only when stated. Keep goto null unless a preview screen id is supplied.
- Use detail "brief" only if asked to hide the page count; keep pages in the data. Use style "cards" for stacked preview tiles, otherwise null for rows. Leave other axes null unless requested.
