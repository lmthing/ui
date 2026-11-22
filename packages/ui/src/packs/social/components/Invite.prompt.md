## Purpose

Bring new members in with a code they can share or scan.

## Pick

Invite people to join an app or group using a copyable, shareable code and optional QR. Not sharing a post (Post) or listing existing members (People).

## Writer

- If the brief says to keep the number who joined without displaying it, write both fields: "joined":3,"detail":"brief" (use the supplied number, not necessarily 3). A null detail shows the count, so use null only when hiding the count was not requested.
- The joined field is null only if the count is unknown. Set qr to true for a scannable version of code. Leave density, surface and align null unless requested.
