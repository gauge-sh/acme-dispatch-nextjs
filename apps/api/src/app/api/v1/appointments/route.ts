import { createAppointment, listAppointments } from "@acme/db";

import { created, ok, readBody, route } from "@/lib/http";
import { dateFilter, intFilter, parsePagination } from "@/lib/query";
import { pageBody, serializeAppointment } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listAppointments(
    {
      jobId: intFilter(params, "job_id"),
      technicianId: intFilter(params, "technician_id"),
      from: dateFilter(params, "from"),
      to: dateFilter(params, "to"),
    },
    page,
  );
  return ok(pageBody(result, serializeAppointment));
});

export const POST = route(async (request) => {
  const appointment = await createAppointment(await readBody(request));
  return created(serializeAppointment(appointment));
});
