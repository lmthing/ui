# apps/gallery/fixtures

Screens and casts used by gallery pages and screenshots.

Built in step U2 onward. Read plan 7 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- One file per fixture, named for what it shows (`ledge-today.ts`, `trot-book.ts`)

Rules:
- Plain data. Fixtures must validate against the catalog.
- Cover very different apps, personal and business. Examples lead with Ledge and Trot.
- Shared casts for tests live in the package's `test/fixtures`.
