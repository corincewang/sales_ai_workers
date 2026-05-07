import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Sales AI workers — MVP
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Roofing lead API + dashboard
        </h1>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
          Contractors from PostgreSQL; AI insights via{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">POST …/insights</code>
          . GAF scraper is Hour 3.
        </p>
        <ul className="mt-8 list-inside list-disc space-y-2 text-zinc-700 dark:text-zinc-300">
          <li>
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              GET /api/contractors
            </code>{" "}
            — optional query params{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              zip
            </code>
            ,{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              q
            </code>
          </li>
          <li>
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              GET /api/contractors/:id
            </code>
          </li>
        </ul>
        <p className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
          >
            Open sales dashboard — ZIP 10013 default
          </Link>
          <Link
            href="/api/contractors?zip=10013"
            className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
          >
            Sample JSON — ZIP 10013
          </Link>
        </p>
      </main>
    </div>
  );
}
