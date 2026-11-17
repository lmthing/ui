# kit/report

Render issue detection. Reports, never decides.

Built in step U6. Read plan 5.8 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `clipped-text.ts` `overflow.ts` `empty-section.ts` `low-contrast.ts`
- `useReport.ts` calls `onReport(issues)` 150 ms after the last layout, at most 300 ms after mount
- `index.ts`

Rules:
- Codes: `clipped_text`, `overflow`, `empty_section`, `low_contrast`, `unknown_component`. Each issue carries the part address.
- Test with fixtures that contain known faults. They must produce exactly the expected issues.
