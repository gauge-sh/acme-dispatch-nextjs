import { listStockLevels } from "@acme/db";

import { ok, route } from "@/lib/http";
import { intFilter, parsePagination } from "@/lib/query";
import { pageBody, serializeStockLevel } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listStockLevels({ partId: intFilter(params, "part_id") }, page);
  return ok(pageBody(result, serializeStockLevel));
});
