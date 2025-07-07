import { deleteJobPart } from "@acme/db";

import { idParam, noContent, route } from "@/lib/http";

export const DELETE = route(async (_request, context) => {
  const id = await idParam(context, "job part");
  await deleteJobPart(id);
  return noContent();
});
