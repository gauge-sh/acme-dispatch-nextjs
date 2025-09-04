import Link from "next/link";

interface PagerProps {
  page: number;
  perPage: number;
  total: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}

function pageHref(props: PagerProps, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(props.query ?? {})) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${props.basePath}?${qs}` : props.basePath;
}

export function Pager(props: PagerProps) {
  const { page, perPage, total } = props;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div className="pager">
      {page > 1 ? <Link href={pageHref(props, page - 1)}>← Newer</Link> : <span>← Newer</span>}
      <span>
        Page {page} of {pages} · {total} total
      </span>
      {page < pages ? <Link href={pageHref(props, page + 1)}>Older →</Link> : <span>Older →</span>}
    </div>
  );
}
