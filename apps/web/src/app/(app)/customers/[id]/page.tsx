import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { DeleteForm } from "@/components/DeleteForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

import { deleteCustomerAction } from "../actions";

export default async function CustomerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) || 0 },
    include: { jobs: { orderBy: { id: "desc" } } },
  });
  if (!customer) notFound();

  return (
    <>
      <div className="page-head">
        <h1>{customer.name}</h1>
        <div className="row-actions">
          <Link className="button secondary" href={`/customers/${customer.id}/edit`}>
            Edit
          </Link>
          <DeleteForm
            action={deleteCustomerAction.bind(null, customer.id)}
            confirmText={`Delete ${customer.name}? This cannot be undone.`}
          />
        </div>
      </div>

      <div className="card">
        <dl className="props">
          <dt>Service address</dt>
          <dd>{customer.serviceAddress}</dd>
          <dt>Contact email</dt>
          <dd>{customer.contactEmail ?? <span className="muted">none</span>}</dd>
          <dt>Phone</dt>
          <dd>{customer.phone ?? <span className="muted">none</span>}</dd>
          <dt>Notes</dt>
          <dd>{customer.notes ?? <span className="muted">none</span>}</dd>
          <dt>Customer since</dt>
          <dd>{formatDate(customer.createdAt)}</dd>
        </dl>
      </div>

      <h2>Jobs</h2>
      {customer.jobs.length === 0 ? (
        <p className="empty">
          No jobs for this customer. <Link href="/jobs/new">Create one.</Link>
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {customer.jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </td>
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
    </>
  );
}
