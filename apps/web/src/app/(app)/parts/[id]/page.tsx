import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { DeleteForm } from "@/components/DeleteForm";
import { StockAdjustForm } from "@/components/forms/StockAdjustForm";
import { formatCents, formatDate } from "@/lib/format";
import { currentUser } from "@/lib/session";

import { adjustStockAction, deletePartAction } from "../actions";

export default async function PartPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const part = await prisma.part.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      stockLevel: true,
      jobParts: {
        include: { job: true },
        orderBy: { id: "desc" },
        take: 15,
      },
    },
  });
  if (!part) notFound();
  const viewer = await currentUser();

  return (
    <>
      <div className="page-head">
        <h1>
          {part.sku} — {part.name}
        </h1>
        <div className="row-actions">
          <Link className="button secondary" href={`/parts/${part.id}/edit`}>
            Edit
          </Link>
          {viewer?.role === "admin" && (
            <DeleteForm
              action={deletePartAction.bind(null, part.id)}
              confirmText={`Delete ${part.sku} from the catalog?`}
            />
          )}
        </div>
      </div>

      <div className="card">
        <dl className="props">
          <dt>Unit cost</dt>
          <dd>{formatCents(part.unitCostCents)}</dd>
          <dt>Unit price</dt>
          <dd>{formatCents(part.unitPriceCents)}</dd>
          <dt>On hand</dt>
          <dd>{part.stockLevel?.quantityOnHand ?? 0}</dd>
          <dt>In catalog since</dt>
          <dd>{formatDate(part.createdAt)}</dd>
        </dl>
      </div>

      <h2>Adjust stock</h2>
      <StockAdjustForm action={adjustStockAction.bind(null, part.id)} />

      <h2>Recent usage</h2>
      {part.jobParts.length === 0 ? (
        <p className="empty">Never used on a job.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th className="num">Qty</th>
              <th className="num">Price at use</th>
              <th>Recorded</th>
            </tr>
          </thead>
          <tbody>
            {part.jobParts.map((jobPart) => (
              <tr key={jobPart.id}>
                <td>
                  <Link href={`/jobs/${jobPart.jobId}`}>{jobPart.job.title}</Link>
                </td>
                <td className="num">{jobPart.quantity}</td>
                <td className="num">{formatCents(jobPart.unitPriceCents)}</td>
                <td>{formatDate(jobPart.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
