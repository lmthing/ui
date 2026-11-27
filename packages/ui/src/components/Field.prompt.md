## Purpose

Enter one form value.

## Pick

A labelled input or file picker. Not search (Search), attached files (FileList), filters (Chips), multiline writing (Composer) or explained choices (Choice).

## Writer

- For a recurring schedule use kind: "repeat" and repeat: "weekly" (or another repeat enum). Omit value; never use kind: "text" with repeat.
- Date values use YYYY-MM-DD, time values HH:MM and photo values lib:<tag> or local:<n>. Fields are one line.
- For a two-ended numeric field use kind "range" with integers min, max, lower and upper, in that order (min <= lower <= upper <= max, min < max). For a microphone input use kind "voice"; omit value for either kind.
- To hide an authored helper hint, keep its text in hint and set detail to "brief".
- Use kind "email" for an email address and "phone" for a phone number, not "text", even on a general contact form.
- Use "password" for a masked, revealable input and "code" for a numeric one-time code. Never prefill either. For "code" only, set length to the requested number of digits (4–8); omit it for six boxes.
- Use kind "file" to choose or attach a document from the device. Omit value: only the host picker supplies an opaque attachment, never a typed filename or file path.
