import { createPart, listParts } from "@acme/db";

import { created, ok, readBody, route } from "@/lib/http";
import { parsePagination, textFilter } from "@/lib/query";
import { pageBody, serializePart } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listParts({ q: textFilter(params, "q") }, page);
  return ok(pageBody(result, serializePart));
});

export const POST = route(async (request) => {
  const part = await createPart(await readBody(request));
  return created(serializePart(part));
});
