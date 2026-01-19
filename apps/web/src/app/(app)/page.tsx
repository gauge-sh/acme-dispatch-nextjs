import Link from "next/link";

import { JOB_STATUSES } from "@acme/core";
import { prisma } from "@acme/db";

import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [byStatus, urgent, upcoming] = await Promise.all([
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.job.findMany({
      where: { priority: "urgent", status: { in: ["requested", "scheduled", "in_progress"] } },
      include: { customer: true },
      orderBy: { id: "asc" },
      take: 8,
    }),
    prisma.appointment.findMany({
      where: { scheduledStart: { gte: new Date() } },
      include: { technician: true, job: { include: { customer: true } } },
      orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
      take: 10,
    }),
  ]);

  const counts = new Map(byStatus.map((row) => [row.status, row._count._all]));

  return (
    <>
      <div className="page-head">
        <h1>Dispatch board</h1>
        <Link className="button" href="/jobs/new">
          New job
        </Link>
      </div>

      <div className="stat-row">
        {JOB_STATUSES.map((status) => (
          <Link key={status} href={`/jobs?status=${status}`} className="stat">
            <div className="n">{counts.get(status) ?? 0}</div>
            <div className="label">{status.replace("_", " ")}</div>
          </Link>
        ))}
      </div>

      <h2>Open urgent jobs</h2>
      {urgent.length === 0 ? (
        <p className="empty">Nothing urgent on the board.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {urgent.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </td>
                <td>{job.customer.name}</td>
                <td>
                  <StatusBadge value={job.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Upcoming appointments</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No appointments on the calendar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Technician</th>
              <th>Job</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((appointment) => (
              <tr key={appointment.id}>
                <td>{formatDateTime(appointment.scheduledStart)}</td>
                <td>
                  <Link href={`/technicians/${appointment.technicianId}`}>
                    {appointment.technician.name}
                  </Link>
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
