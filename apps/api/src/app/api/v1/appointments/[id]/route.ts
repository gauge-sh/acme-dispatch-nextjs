import { deleteAppointment, getAppointment, updateAppointment } from "@acme/db";

import { idParam, noContent, ok, readBody, route } from "@/lib/http";
import { serializeAppointment } from "@/lib/serialize";

export const GET = route(async (_request, context) => {
  const id = await idParam(context, "appointment");
  return ok(serializeAppointment(await getAppointment(id)));
});

export const PATCH = route(async (request, context) => {
  const id = await idParam(context, "appointment");
  const appointment = await updateAppointment(id, await readBody(request));
  return ok(serializeAppointment(appointment));
});

export const DELETE = route(async (_request, context) => {
  const id = await idParam(context, "appointment");
  await deleteAppointment(id);
  return noContent();
});
