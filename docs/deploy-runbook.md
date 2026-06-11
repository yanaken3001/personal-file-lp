# Deploy Runbook

This runbook records the current production workflow for PERSONAL FILE and 80CARDS.

## Current Production Setup

- Production GitHub repository: `yanaken3001/personal-file-lp`
- Local production folder: `personalfile`
- Production domain: `https://www.personal-file.jp/`
- Vercel connected repository: `yanaken3001/personal-file-lp`

Do not change the Vercel connected repository to `yanaken3001/personalfile-80cards`.

## Page Ownership

- `https://www.personal-file.jp/` is the existing main top page.
- Root `index.html` owns the main top page and must not be edited without explicit instruction.
- `https://www.personal-file.jp/80cards/` is the production 80CARDS page.
- 80CARDS production files live under `80cards/`.
- `https://www.personal-file.jp/80cards/dev-results.html` is a development check page. It is public if someone knows the URL, so check it for secrets or private information before publishing updates.
- Root `80type/` must not be changed without explicit instruction.

## Reference Workspace

- `personalfile_site_portable` is a reference and work source for 80CARDS.
- It must not be committed to `yanaken3001/personal-file-lp`.
- It is ignored by `.gitignore`.

## 80CARDS Update Flow

1. Confirm the repository and clean state:

```powershell
git remote -v
git branch --show-current
git status --short
```

2. Make the requested changes only under `80cards/`.

3. Confirm protected files are unchanged:

```powershell
git diff --quiet -- index.html
git diff --quiet -- 80type
git diff --quiet -- vercel.json
```

4. Check URL and asset references when relevant:

```powershell
rg "/80type|80type/" 80cards
rg "https://www.personal-file.jp/80type" 80cards
rg "character/|card-background/|href=|src=" 80cards
```

5. Stage exact files only. Do not use `git add .`.

Examples:

```powershell
git add 80cards/index.html
git add 80cards/types.html
git add 80cards/compatibility.html
git add 80cards/dev-results.html
git add 80cards/character
git add 80cards/card-background
```

6. Verify the staged diff before committing:

```powershell
git diff --cached --name-status
```

Commit only if staged files are the intended `80cards/` files.

7. Push to production branch:

```powershell
git push origin main
```

8. Confirm Vercel Production Deployment succeeds.

9. Verify production URLs:

```text
https://www.personal-file.jp/
https://www.personal-file.jp/80cards/
https://www.personal-file.jp/80cards/types.html
https://www.personal-file.jp/80cards/compatibility.html
https://www.personal-file.jp/80cards/dev-results.html
https://www.personal-file.jp/80cards/character/AA.png
https://www.personal-file.jp/80cards/card-background/AA.webp
https://www.personal-file.jp/80type
https://www.personal-file.jp/80type/
```

Expected results:

- `/` remains the existing main top page.
- `/80cards/` shows the latest 80CARDS page.
- `/80cards/compatibility.html` and `/80cards/dev-results.html` return `200`.
- 80CARDS character and card-background assets return `200`.
- `/80type` and `/80type/` redirect to `/80cards/`.

## Do Not Change Without Explicit Instruction

- Root `index.html`
- Root `80type/`
- `vercel.json`
- Package settings
- Vercel settings
- Main top-page CTA, form flow, SEO/OGP, or tracking
