import { getInvoice } from "@acme/db";

import { idParam, ok, route } from "@/lib/http";
import { serializeInvoice } from "@/lib/serialize";

export const GET = route(async (_request, context) => {
  const id = await idParam(context, "invoice record");
  return ok(serializeInvoice(await getInvoice(id)));
});
