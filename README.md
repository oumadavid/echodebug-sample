# echodebug-sample

Minimal Next.js (App Router, TypeScript) app that **fails `next build` on purpose**. Use it to feed a real stack trace into an error-log debugging agent (for example `POST` to an n8n webhook).

## Reproduce the failure

```bash
npm install
npm run build
```

Do **not** copy `.env.example` to `.env` if you want the failure. There is no `.env` in the repo.

## What breaks

`app/page.tsx` imports `@/lib/db`. That module reads `process.env.DATABASE_URL` at **import time**. Next.js evaluates it during `next build`. The variable is unset, so the file throws.

Look for a comment block in `lib/db.ts` labeled **INTENTIONAL BUILD BUG**.

## Expected error (shape)

`npm run build` should exit non-zero. The log typically includes:

- `Error: DATABASE_URL is not set. The app db client is initialized at import time, so \`next build\` fails without this env var.`
- a stack pointing at `lib/db.ts`
- Next.js reporting the page/module that imported it (often `app/page.tsx`)

Copy the last ~50 lines of stderr into your debugging agent.

## Hear the diagnosis in this terminal

The n8n webhook returns JSON (including MP3 as base64). A browser or data URL will not speak in Git Bash. Use the local client: it reprints the error in this terminal, then **plays** the spoken explanation (no explanation text). Playback uses ffplay if installed, otherwise Windows MediaPlayer with no extra window.

```bash
npm run build 2>&1 | tee last-build.log
node scripts/echodebug.js --from-file last-build.log
```

Or pipe stdin:

```bash
npm run build 2>&1 | node scripts/echodebug.js
```

Optional: `ECHODEBUG_WEBHOOK` overrides the default `https://jsninja.app.n8n.cloud/webhook/debug`. `--no-play` skips audio (error text only).

## 5-minute slides

Live deck: https://oumadavid.github.io/echodebug-sample/

Or open `slides/index.html` locally. Arrow keys or click to advance; `F` for fullscreen.

## How you would fix it (do not do this for the sample)

```bash
copy .env.example .env
```

Then set a real `DATABASE_URL` in `.env` and run `npm run build` again.
