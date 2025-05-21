import { deleteCustomer, getCustomer, updateCustomer } from "@acme/db";

import { idParam, noContent, ok, readBody, route } from "@/lib/http";
import { serializeCustomer } from "@/lib/serialize";

export const GET = route(async (_request, context) => {
  const id = await idParam(context, "customer");
  return ok(serializeCustomer(await getCustomer(id)));
});

export const PATCH = route(async (request, context) => {
  const id = await idParam(context, "customer");
  const customer = await updateCustomer(id, await readBody(request));
  return ok(serializeCustomer(customer));
});

export const DELETE = route(async (_request, context) => {
  const id = await idParam(context, "customer");
  await deleteCustomer(id);
  return noContent();
});
