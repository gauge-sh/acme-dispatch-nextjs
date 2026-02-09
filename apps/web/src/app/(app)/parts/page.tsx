import Link from "next/link";

import { listParts, prisma } from "@acme/db";

import { Pager } from "@/components/Pager";
import { formatCents } from "@/lib/format";

export const metadata = { title: "Parts & stock" };

const PER_PAGE = 25;

interface SearchParams {
  q?: string;
  page?: string;
}

export default async function PartsPage(props: { searchParams: Promise<SearchParams> }) {
  const params = await props.searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;
  const result = await listParts({ q }, { page, perPage: PER_PAGE });
  const stock = await prisma.stockLevel.findMany({
    where: { partId: { in: result.items.map((part) => part.id) } },
  });
  const onHand = new Map(stock.map((level) => [level.partId, level.quantityOnHand]));

  return (
    <>
      <div className="page-head">
        <h1>Parts &amp; stock</h1>
        <Link className="button" href="/parts/new">
          Add part
        </Link>
      </div>

      <form className="filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={q ?? ""} placeholder="SKU or name" />
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="empty">{q ? `No parts match “${q}”.` : "The catalog is empty."}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th className="num">Cost</th>
              <th className="num">Price</th>
              <th className="num">On hand</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((part) => (
              <tr key={part.id}>
                <td>
                  <Link href={`/parts/${part.id}`}>{part.sku}</Link>
                </td>
                <td>{part.name}</td>
                <td className="num">{formatCents(part.unitCostCents)}</td>
                <td className="num">{formatCents(part.unitPriceCents)}</td>
                <td className="num">{onHand.get(part.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/parts"
        query={{ q }}
      />
    </>
  );
}
