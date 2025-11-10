import Link from "next/link";
import { notFound } from "next/navigation";

import { allowedTransitions, type JobStatus } from "@acme/core";
import { prisma } from "@acme/db";

import { ActionButton } from "@/components/ActionButton";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { JobPartForm } from "@/components/forms/JobPartForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents, formatDateTime, formatHoursBetween } from "@/lib/format";

import {
  addJobPartAction,
  deleteJobAction,
  invoiceJobAction,
  removeAppointmentAction,
  removeJobPartAction,
  scheduleAppointmentAction,
  transitionJobAction,
} from "../actions";

export default async function JobPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const job = await prisma.job.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      customer: true,
      invoiceRecord: true,
      appointments: {
        include: { technician: true },
        orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
      },
      jobParts: { include: { part: true }, orderBy: { id: "asc" } },
    },
  });
  if (!job) notFound();

  const status = job.status as JobStatus;
  const nextStatuses = allowedTransitions(status).filter((value) => value !== "invoiced");
  const canSchedule = ["requested", "scheduled", "in_progress"].includes(status);
  const canAddParts = !["invoiced", "cancelled"].includes(status);
  const [technicians, parts] = await Promise.all([
    canSchedule
      ? prisma.technician.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canAddParts
      ? prisma.part.findMany({ include: { stockLevel: true }, orderBy: { sku: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>
          #{job.id} · {job.title}
        </h1>
        <div className="row-actions">
          <Link className="button secondary" href={`/jobs/${job.id}/edit`}>
            Edit
          </Link>
          {status !== "invoiced" && (
            <ActionButton
              action={deleteJobAction.bind(null, job.id)}
              label="Delete"
              className="danger"
              confirmText="Delete this job? Recorded parts return to stock."
            />
          )}
        </div>
      </div>

      <div className="card">
        <dl className="props">
          <dt>Customer</dt>
          <dd>
            <Link href={`/customers/${job.customerId}`}>{job.customer.name}</Link>
          </dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge value={job.status} />
          </dd>
          <dt>Priority</dt>
          <dd>
            <StatusBadge value={job.priority} />
          </dd>
          <dt>Description</dt>
          <dd>{job.description ?? <span className="muted">none</span>}</dd>
          {job.invoiceRecord && (
            <>
              <dt>Invoice</dt>
              <dd>
                <Link href={`/invoices/${job.invoiceRecord.id}`}>
                  {formatCents(job.invoiceRecord.totalCents)} — view record
                </Link>
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="section-actions">
        {nextStatuses.map((next) => (
          <ActionButton
            key={next}
            action={transitionJobAction.bind(null, job.id, next)}
            label={`Mark ${next.replace("_", " ")}`}
            className={next === "cancelled" ? "danger" : "secondary"}
            confirmText={next === "cancelled" ? "Cancel this job?" : undefined}
          />
        ))}
        {status === "completed" && !job.invoiceRecord && (
          <ActionButton
            action={invoiceJobAction.bind(null, job.id)}
            label="Generate invoice record"
          />
        )}
      </div>

      <h2>Appointments</h2>
      {job.appointments.length === 0 ? (
        <p className="empty">
          Nothing booked yet{canSchedule ? " — schedule the first visit below." : "."}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>Length</th>
              <th>Technician</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {job.appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>{formatDateTime(appointment.scheduledStart)}</td>
                <td>
                  {formatHoursBetween(appointment.scheduledStart, appointment.scheduledEnd)}
                </td>
                <td>
                  <Link href={`/technicians/${appointment.technicianId}`}>
                    {appointment.technician.name}
                  </Link>
                </td>
                <td>{appointment.completionNotes ?? <span className="muted">—</span>}</td>
                <td>
                  <div className="row-actions">
                    <Link href={`/appointments/${appointment.id}/edit`}>Reschedule</Link>
                    <ActionButton
                      action={removeAppointmentAction.bind(null, appointment.id, job.id)}
                      label="Remove"
                      className="link"
                      confirmText="Remove this appointment?"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canSchedule && (
        <details open={job.appointments.length === 0}>
          <summary>Schedule a visit</summary>
          <AppointmentForm
            action={scheduleAppointmentAction.bind(null, job.id)}
            technicians={technicians}
          />
        </details>
      )}

      <h2>Parts used</h2>
      {job.jobParts.length === 0 ? (
        <p className="empty">No parts recorded.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Line total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {job.jobParts.map((jobPart) => (
              <tr key={jobPart.id}>
                <td>
                  <Link href={`/parts/${jobPart.partId}`}>
                    {jobPart.part.sku} — {jobPart.part.name}
                  </Link>
                </td>
                <td className="num">{jobPart.quantity}</td>
                <td className="num">{formatCents(jobPart.unitPriceCents)}</td>
                <td className="num">
                  {formatCents(jobPart.quantity * jobPart.unitPriceCents)}
                </td>
                <td>
                  {status !== "invoiced" && (
                    <ActionButton
                      action={removeJobPartAction.bind(null, jobPart.id, job.id)}
                      label="Return to stock"
                      className="link"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canAddParts && (
        <details>
          <summary>Record a part</summary>
          <JobPartForm action={addJobPartAction.bind(null, job.id)} parts={parts} />
        </details>
      )}
    </>
  );
}
