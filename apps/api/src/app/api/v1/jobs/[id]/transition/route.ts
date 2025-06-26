import { ValidationFailed, isJobStatus } from "@acme/core";
import { transitionJob } from "@acme/db";

import { idParam, ok, readBody, route } from "@/lib/http";
import { serializeJobDetail } from "@/lib/serialize";

export const POST = route(async (request, context) => {
  const id = await idParam(context, "job");
  const body = await readBody(request);
  const status = body["status"];
  if (typeof status !== "string" || !isJobStatus(status)) {
    throw new ValidationFailed("unknown status");
  }
  const job = await transitionJob(id, status);
  return ok(serializeJobDetail(job));
});
