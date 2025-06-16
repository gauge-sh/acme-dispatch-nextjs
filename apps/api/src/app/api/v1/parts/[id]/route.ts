import { deletePart, getPart, updatePart } from "@acme/db";

import { idParam, noContent, ok, readBody, route } from "@/lib/http";
import { serializePart } from "@/lib/serialize";

export const GET = route(async (_request, context) => {
  const id = await idParam(context, "part");
  return ok(serializePart(await getPart(id)));
});

export const PATCH = route(async (request, context) => {
  const id = await idParam(context, "part");
  const part = await updatePart(id, await readBody(request));
  return ok(serializePart(part));
});

export const DELETE = route(
  async (_request, context) => {
    const id = await idParam(context, "part");
    await deletePart(id);
    return noContent();
  },
  { admin: true },
);
