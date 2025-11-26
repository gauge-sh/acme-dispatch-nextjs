import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { formatCents, formatDateTime } from "@/lib/format";

export default async function InvoicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const record = await prisma.invoiceRecord.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      job: { include: { customer: true } },
    },
  });
  if (!record) notFound();

  return (
    <>
      <h1>Invoice record #{record.id}</h1>
      <div className="card">
        <dl className="props">
          <dt>Job</dt>
          <dd>
            <Link href={`/jobs/${record.jobId}`}>{record.job.title}</Link>
          </dd>
          <dt>Customer</dt>
          <dd>
            <Link href={`/customers/${record.job.customerId}`}>
              {record.job.customer.name}
            </Link>
          </dd>
          <dt>Created</dt>
          <dd>{formatDateTime(record.createdAt)}</dd>
        </dl>
      </div>

      <h2>Line items</h2>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit</th>
            <th className="num">Amount</th>
            <th>Weekend</th>
          </tr>
        </thead>
        <tbody>
          {record.lineItems.map((line) => (
            <tr key={line.id}>
              <td>{line.description}</td>
              <td className="num">{line.quantity}</td>
              <td className="num">{formatCents(line.unitCents)}</td>
              <td className="num">{formatCents(line.amountCents)}</td>
              <td>{line.kind === "labor" ? (line.weekend ? "yes" : "no") : "—"}</td>
            </tr>
          ))}
          <tr>
            <td className="num" colSpan={3}>
              Labor
            </td>
            <td className="num">{formatCents(record.laborCents)}</td>
            <td />
          </tr>
          <tr>
            <td className="num" colSpan={3}>
              Parts
            </td>
            <td className="num">{formatCents(record.partsCents)}</td>
            <td />
          </tr>
          <tr>
            <td className="num" colSpan={3}>
              <strong>Total billed</strong>
            </td>
            <td className="num">
              <strong>{formatCents(record.totalCents)}</strong>
            </td>
            <td />
          </tr>
        </tbody>
      </table>
      <p className="muted">
        Invoice records are immutable — they capture what was billable when the job
        closed.
      </p>
    </>
  );
}
