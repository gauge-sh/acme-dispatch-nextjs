import { createTechnician, listTechnicians } from "@acme/db";

import { created, ok, readBody, route } from "@/lib/http";
import { boolFilter, parsePagination, textFilter } from "@/lib/query";
import { pageBody, serializeTechnician } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listTechnicians(
    { isActive: boolFilter(params, "is_active"), skill: textFilter(params, "skill") },
    page,
  );
  return ok(pageBody(result, serializeTechnician));
});

export const POST = route(async (request) => {
  const technician = await createTechnician(await readBody(request));
  return created(serializeTechnician(technician));
});
