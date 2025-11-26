import Link from "next/link";

import { listInvoices, prisma } from "@acme/db";

import { Pager } from "@/components/Pager";
import { formatCents, formatDate } from "@/lib/format";

const PER_PAGE = 25;

interface SearchParams {
  customer_id?: string;
  page?: string;
}

export default async function InvoicesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const customerId = Number(params.customer_id) || undefined;

  const [result, customers] = await Promise.all([
    listInvoices({ customerId }, { page, perPage: PER_PAGE }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  const jobs = await prisma.job.findMany({
    where: { id: { in: result.items.map((record) => record.jobId) } },
    include: { customer: true },
  });
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  return (
    <>
      <div className="page-head">
        <h1>Invoice records</h1>
      </div>

      <form className="filters" method="get">
        <label>
          Customer
          <select name="customer_id" defaultValue={params.customer_id ?? ""}>
            <option value="">All</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="empty">
          No invoice records yet. Completed jobs grow one from their job page.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Job</th>
              <th>Customer</th>
              <th className="num">Labor</th>
              <th className="num">Parts</th>
              <th className="num">Total</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((record) => {
              const job = jobsById.get(record.jobId);
              return (
                <tr key={record.id}>
                  <td>
                    <Link href={`/invoices/${record.id}`}>#{record.id}</Link>
                  </td>
                  <td>
                    <Link href={`/jobs/${record.jobId}`}>{job?.title ?? `#${record.jobId}`}</Link>
                  </td>
                  <td>{job?.customer.name ?? "—"}</td>
                  <td className="num">{formatCents(record.laborCents)}</td>
                  <td className="num">{formatCents(record.partsCents)}</td>
                  <td className="num">{formatCents(record.totalCents)}</td>
                  <td>{formatDate(record.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pager
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/invoices"
        query={{ customer_id: params.customer_id }}
      />
    </>
  );
}
