# Repository Operations

This repository is the production repository for the PERSONAL FILE site.

## Production Repo

- GitHub repository: `yanaken3001/personal-file-lp`
- Local production working folder: `personalfile`
- Vercel production project is connected to `yanaken3001/personal-file-lp`.
- Do not switch the Vercel connected repository to `yanaken3001/personalfile-80cards`.

## Site Boundaries

- `https://www.personal-file.jp/` is the existing main top page.
- The root `index.html` is the main top page and must not be changed unless explicitly requested.
- `https://www.personal-file.jp/80cards/` is managed as the 80CARDS subpage.
- 80CARDS production changes should be made under `80cards/`.
- `https://www.personal-file.jp/80cards/dev-results.html` is maintained as a URL-known development check page.
- The root `80type/` directory is legacy production content and must not be changed unless explicitly requested.
- Keep existing top-page CTA, form flow, SEO/OGP, and tracking intact unless explicitly requested.

## Source Workspace

- `personalfile_site_portable` is a reference/work workspace for 80CARDS.
- Do not commit `personalfile_site_portable/` into this production repository.
- `personalfile_site_portable/` is intentionally ignored by `.gitignore`.

## Reference Docs

- [80CARDS adaptive branch decision record](docs/adaptive-branch-decision.md)

## Git Safety

- Do not use `git add .`.
- Stage only the exact files required for the task.
- For 80CARDS changes, explicitly stage paths under `80cards/`, for example:

```powershell
git add 80cards/index.html
git add 80cards/types.html
git add 80cards/compatibility.html
git add 80cards/dev-results.html
git add 80cards/character
git add 80cards/card-background
```

- Before committing, verify staged files:

```powershell
git diff --cached --name-status
```

- Stop before committing if staged files include root `index.html`, root `80type/`, `vercel.json`, package files, `personalfile_site_portable/`, or unrelated files.

## Deployment Verification

After pushing to `origin main`, confirm that Vercel creates a Production Deployment and that it succeeds.

Verify these production URLs after deployment:

- `https://www.personal-file.jp/`
- `https://www.personal-file.jp/80cards/`
- `https://www.personal-file.jp/80cards/types.html`
- `https://www.personal-file.jp/80cards/compatibility.html`
- `https://www.personal-file.jp/80cards/dev-results.html`
- `https://www.personal-file.jp/80cards/character/AA.png`
- `https://www.personal-file.jp/80cards/card-background/AA.webp`
- `https://www.personal-file.jp/80type`
- `https://www.personal-file.jp/80type/`

Expected behavior:

- `/` remains the existing main top page.
- `/80cards/` shows the latest 80CARDS page.
- `/80cards/dev-results.html` is reachable as a development check page.
- `/80type` and `/80type/` redirect to `/80cards/`.
