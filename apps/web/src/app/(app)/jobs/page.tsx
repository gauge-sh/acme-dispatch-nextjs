import Link from "next/link";

import { isJobStatus, isPriority, JOB_STATUSES, PRIORITIES } from "@acme/core";
import { listJobs, prisma } from "@acme/db";

import { Pager } from "@/components/Pager";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Jobs" };

const PER_PAGE = 25;

interface SearchParams {
  status?: string;
  priority?: string;
  customer_id?: string;
  q?: string;
  page?: string;
}

export default async function JobsPage(props: { searchParams: Promise<SearchParams> }) {
  const params = await props.searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status && isJobStatus(params.status) ? params.status : undefined;
  const priority =
    params.priority && isPriority(params.priority) ? params.priority : undefined;
  const customerId = Number(params.customer_id) || undefined;
  const q = params.q?.trim() || undefined;

  const [result, customers] = await Promise.all([
    listJobs(
      { statuses: status ? [status] : undefined, priority, customerId, q },
      { page, perPage: PER_PAGE },
    ),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));

  return (
    <>
      <div className="page-head">
        <h1>Jobs</h1>
        <Link className="button" href="/jobs/new">
          New job
        </Link>
      </div>

      <form className="filters" method="get">
        <label>
          Status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            {JOB_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue={priority ?? ""}>
            <option value="">All</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
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
        <label>
          Title contains
          <input name="q" defaultValue={q ?? ""} />
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="empty">No jobs match those filters.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </td>
                <td>{customersById.get(job.customerId)?.name ?? `#${job.customerId}`}</td>
                <td>
                  <StatusBadge value={job.priority} />
                </td>
                <td>
                  <StatusBadge value={job.status} />
                </td>
                <td>{formatDate(job.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/jobs"
        query={{ status, priority, customer_id: params.customer_id, q }}
      />
    </>
  );
}
