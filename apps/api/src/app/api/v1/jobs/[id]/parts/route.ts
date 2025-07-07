import { addJobPart } from "@acme/db";

import { created, idParam, readBody, route } from "@/lib/http";
import { serializeJobPart } from "@/lib/serialize";

export const POST = route(async (request, context) => {
  const jobId = await idParam(context, "job");
  const jobPart = await addJobPart(jobId, await readBody(request));
  return created(serializeJobPart(jobPart));
});
