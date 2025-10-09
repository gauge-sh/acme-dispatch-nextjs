import Link from "next/link";
import { notFound } from "next/navigation";

import { parseSkillTags, prisma } from "@acme/db";

import { DeleteForm } from "@/components/DeleteForm";
import { formatCents, formatDateTime, formatHoursBetween } from "@/lib/format";
import { currentUser } from "@/lib/session";

import { deleteTechnicianAction } from "../actions";

export default async function TechnicianPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const technician = await prisma.technician.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      appointments: {
        include: { job: { include: { customer: true } } },
        orderBy: [{ scheduledStart: "desc" }, { id: "desc" }],
        take: 20,
      },
    },
  });
  if (!technician) notFound();
  const viewer = await currentUser();

  return (
    <>
      <div className="page-head">
        <h1>{technician.name}</h1>
        <div className="row-actions">
          <Link className="button secondary" href={`/technicians/${technician.id}/edit`}>
            Edit
          </Link>
          {viewer?.role === "admin" && (
            <DeleteForm
              action={deleteTechnicianAction.bind(null, technician.id)}
              confirmText={`Remove ${technician.name} from the roster?`}
            />
          )}
        </div>
      </div>

      <div className="card">
        <dl className="props">
          <dt>Phone</dt>
          <dd>{technician.phone ?? <span className="muted">none</span>}</dd>
          <dt>Skills</dt>
          <dd>{parseSkillTags(technician.skillTags).join(", ") || "—"}</dd>
          <dt>Hourly cost</dt>
          <dd>{formatCents(technician.hourlyCostCents)}</dd>
          <dt>Status</dt>
          <dd>{technician.isActive ? "Active" : "Inactive — cannot take new appointments"}</dd>
        </dl>
      </div>

      <h2>Recent and upcoming appointments</h2>
      {technician.appointments.length === 0 ? (
        <p className="empty">Never booked.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>Length</th>
              <th>Job</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            {technician.appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>{formatDateTime(appointment.scheduledStart)}</td>
                <td>
                  {formatHoursBetween(appointment.scheduledStart, appointment.scheduledEnd)}
                </td>
                <td>
                  <Link href={`/jobs/${appointment.jobId}`}>{appointment.job.title}</Link>
                </td>
                <td>{appointment.job.customer.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
