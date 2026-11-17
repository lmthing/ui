# apps/gallery/e2e

Playwright specs against the static web export.

Built in step U2 onward. Read plan 7 and 8 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `screenshots.spec.ts` every component page and every fixture
- `agent.spec.ts` fixtures driven through `window.__lmthingUI.act` and the accessibility tree reach the same read output
- `a11y.spec.ts` axe-core, no violations, every interactive part has a role and label

Rules:
- A pixel difference above 0.1% fails CI. Baselines update only through a pull request labelled `update-screenshots`.
- No chart path data may appear in the accessibility tree.
