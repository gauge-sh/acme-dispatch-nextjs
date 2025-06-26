import { deleteJob, getJob, updateJob } from "@acme/db";

import { idParam, noContent, ok, readBody, route } from "@/lib/http";
import { serializeJobDetail } from "@/lib/serialize";

export const GET = route(async (_request, context) => {
  const id = await idParam(context, "job");
  return ok(serializeJobDetail(await getJob(id)));
});

export const PATCH = route(async (request, context) => {
  const id = await idParam(context, "job");
  const job = await updateJob(id, await readBody(request));
  return ok(serializeJobDetail(job));
});

export const DELETE = route(async (_request, context) => {
  const id = await idParam(context, "job");
  await deleteJob(id);
  return noContent();
});
