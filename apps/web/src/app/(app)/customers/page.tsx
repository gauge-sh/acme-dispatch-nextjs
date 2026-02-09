import Link from "next/link";

import { listCustomers } from "@acme/db";

import { Pager } from "@/components/Pager";

export const metadata = { title: "Customers" };

const PER_PAGE = 25;

interface SearchParams {
  q?: string;
  page?: string;
}

export default async function CustomersPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;
  const result = await listCustomers({ q }, { page, perPage: PER_PAGE });

  return (
    <>
      <div className="page-head">
        <h1>Customers</h1>
        <Link className="button" href="/customers/new">
          New customer
        </Link>
      </div>

      <form className="filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={q ?? ""} placeholder="Name or address" />
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="empty">
          {q ? `No customers match “${q}”.` : "No customers yet — add the first one."}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Service address</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link href={`/customers/${customer.id}`}>{customer.name}</Link>
                </td>
                <td>{customer.serviceAddress}</td>
                <td>
                  {customer.contactEmail ?? customer.phone ?? (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/customers"
        query={{ q }}
      />
    </>
  );
}
