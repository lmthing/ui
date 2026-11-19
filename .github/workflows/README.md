# workflows

CI.

Built in step U0. Read plan 11 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `ci.yml` every pull request, all steps required
- `pages.yml` push to main: builds `apps/site` (landing site and gallery screenshots, cached) and deploys it to GitHub Pages
- `release.yml` tagged releases, disabled until a registry is chosen

Rules:
- `ci.yml` steps in order: install with the frozen lockfile, typecheck, lint, test, `catalog:check` (contrast, token budgets, bundle check), `kit:themes --check`, build, gallery export and screenshots, size report.
- `release.yml` publishes with Changesets and stays disabled until the registry question is settled.
