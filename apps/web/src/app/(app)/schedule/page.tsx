import Link from "next/link";

import { prisma } from "@acme/db";

import { formatTime } from "@/lib/format";

export const metadata = { title: "Schedule" };

const DAY_MS = 86_400_000;

function startOfUtcDay(value: Date): Date {
  return new Date(Math.floor(value.getTime() / DAY_MS) * DAY_MS);
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

export default async function SchedulePage(props: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await props.searchParams;
  const requested = params.from ? new Date(`${params.from}T00:00:00Z`) : new Date();
  const start = startOfUtcDay(
    Number.isNaN(requested.getTime()) ? new Date() : requested,
  );
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));

  const [technicians, appointments] = await Promise.all([
    prisma.technician.findMany({ orderBy: { name: "asc" } }),
    prisma.appointment.findMany({
      where: { scheduledStart: { gte: start, lt: end } },
      include: { job: { include: { customer: true } } },
      orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
    }),
  ]);

  const byCell = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = `${appointment.technicianId}:${isoDay(appointment.scheduledStart)}`;
    const cell = byCell.get(key) ?? [];
    cell.push(appointment);
    byCell.set(key, cell);
  }

  const prev = isoDay(new Date(start.getTime() - 7 * DAY_MS));
  const next = isoDay(new Date(start.getTime() + 7 * DAY_MS));

  return (
    <>
      <div className="page-head">
        <h1>
          Week of {isoDay(start)} <span className="muted">(UTC)</span>
        </h1>
        <div className="row-actions">
          <Link className="button secondary" href={`/schedule?from=${prev}`}>
            ← Previous
          </Link>
          <Link className="button secondary" href="/schedule">
            Today
          </Link>
          <Link className="button secondary" href={`/schedule?from=${next}`}>
            Next →
          </Link>
        </div>
      </div>

      {technicians.length === 0 ? (
        <p className="empty">No technicians on the roster.</p>
      ) : (
        <table className="schedule-grid">
          <thead>
            <tr>
              <th>Technician</th>
              {days.map((day) => (
                <th key={isoDay(day)}>{isoDay(day).slice(5)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {technicians.map((technician) => (
              <tr key={technician.id}>
                <td>
                  <Link href={`/technicians/${technician.id}`}>{technician.name}</Link>
                  {!technician.isActive && (
                    <>
                      {" "}
                      <span className="badge inactive">inactive</span>
                    </>
                  )}
                </td>
                {days.map((day) => {
                  const cell = byCell.get(`${technician.id}:${isoDay(day)}`) ?? [];
                  return (
                    <td key={isoDay(day)}>
                      {cell.map((appointment) => (
                        <div key={appointment.id}>
                          <Link href={`/jobs/${appointment.jobId}`}>
                            {formatTime(appointment.scheduledStart)}–
                            {formatTime(appointment.scheduledEnd)}{" "}
                            {appointment.job.customer.name}
                          </Link>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
