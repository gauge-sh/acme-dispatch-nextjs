import { deleteTechnician, getTechnician, updateTechnician } from "@acme/db";

import { idParam, noContent, ok, readBody, route } from "@/lib/http";
import { serializeTechnician } from "@/lib/serialize";

export const GET = route(async (_request, context) => {
  const id = await idParam(context, "technician");
  return ok(serializeTechnician(await getTechnician(id)));
});

export const PATCH = route(async (request, context) => {
  const id = await idParam(context, "technician");
  const technician = await updateTechnician(id, await readBody(request));
  return ok(serializeTechnician(technician));
});

export const DELETE = route(
  async (_request, context) => {
    const id = await idParam(context, "technician");
    await deleteTechnician(id);
    return noContent();
  },
  { admin: true },
);
