import { createInvoiceForJob, getJob } from "@acme/db";

import { created, idParam, route } from "@/lib/http";
import { serializeInvoice } from "@/lib/serialize";

export const POST = route(async (_request, context) => {
  const jobId = await idParam(context, "job");
  await getJob(jobId); // 404 before any state checks
  const record = await createInvoiceForJob(jobId);
  return created(serializeInvoice(record));
});
