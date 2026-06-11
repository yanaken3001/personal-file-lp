# 80CARDS Phase 2b build notes

## Files

- Source JSX: `80cards/src/app.jsx`
- Generated production file: `80cards/app.js`
- Production HTML loader: `80cards/index.html`

`80cards/app.js` is an auto-generated file. Do not edit it directly.

## Regenerate app.js

Run from this repository:

```powershell
cd tests/80cards
node build-app.mjs
```

This transpiles `80cards/src/app.jsx` with `@babel/preset-react` and writes `80cards/app.js`.

## Drift detection

`npm test` runs `node check-app-build.mjs` before the golden diagnosis tests. The check transpiles `80cards/src/app.jsx` into a temporary directory and compares the generated file with the committed `80cards/app.js`.

If the files do not match exactly, `npm test` fails. Regenerate `app.js` with:

```powershell
cd tests/80cards
node build-app.mjs
```

Then rerun:

```powershell
npm test
```

## Golden tests

The golden tests evaluate the shipped artifact, `80cards/app.js`, directly. They do not evaluate `80cards/src/app.jsx`.

The golden JSON values must not be changed as part of this build migration.
