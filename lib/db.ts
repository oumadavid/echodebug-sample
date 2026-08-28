/**
 * INTENTIONAL BUILD BUG — do not "fix" this for the sample repo.
 *
 * This module is imported from a Server Component (app/page.tsx). Next.js
 * evaluates it while compiling `next build`. DATABASE_URL is never provided
 * (there is no `.env` in this repo, only `.env.example`), so the throw
 * below runs at build time and the production build fails with a real stack.
 *
 * To make the build succeed: copy `.env.example` to `.env` and set DATABASE_URL.
 */
const raw = process.env.DATABASE_URL;

if (!raw) {
  throw new Error(
    "DATABASE_URL is not set. The app db client is initialized at import time, so `next build` fails without this env var.",
  );
}

const databaseUrl: string = raw;

export function getDatabaseUrl(): string {
  return databaseUrl;
}
