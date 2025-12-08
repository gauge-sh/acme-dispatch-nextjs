import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Not found</h1>
      <p className="muted">
        That record does not exist — it may have been deleted, or the link is stale.
      </p>
      <p>
        <Link href="/">Back to the dispatch board</Link>
      </p>
    </main>
  );
}
