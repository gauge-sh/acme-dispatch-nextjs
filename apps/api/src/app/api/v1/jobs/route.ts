import { createJob, listJobs } from "@acme/db";

import { created, ok, readBody, route } from "@/lib/http";
import {
  intFilter,
  parsePagination,
  priorityFilter,
  statusListFilter,
  textFilter,
} from "@/lib/query";
import { pageBody, serializeJob, serializeJobDetail } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listJobs(
    {
      statuses: statusListFilter(params),
      priority: priorityFilter(params),
      customerId: intFilter(params, "customer_id"),
      q: textFilter(params, "q"),
    },
    page,
  );
  return ok(pageBody(result, serializeJob));
});

export const POST = route(async (request) => {
  const job = await createJob(await readBody(request));
  return created(serializeJobDetail(job));
});
