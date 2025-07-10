import { listInvoices } from "@acme/db";

import { ok, route } from "@/lib/http";
import { intFilter, parsePagination } from "@/lib/query";
import { pageBody, serializeInvoice } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listInvoices(
    {
      jobId: intFilter(params, "job_id"),
      customerId: intFilter(params, "customer_id"),
    },
    page,
  );
  return ok(pageBody(result, serializeInvoice));
});
