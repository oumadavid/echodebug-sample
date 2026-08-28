import { getDatabaseUrl } from "@/lib/db";

export default function HomePage() {
  // Importing getDatabaseUrl pulls in lib/db.ts. That file throws when
  // DATABASE_URL is missing, which is what makes `next build` fail.
  const url = getDatabaseUrl();

  return (
    <main>
      <h1>echodebug-sample</h1>
      <p>Connected to {url}</p>
    </main>
  );
}
