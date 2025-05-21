import { createCustomer, listCustomers } from "@acme/db";

import { created, ok, readBody, route } from "@/lib/http";
import { parsePagination, textFilter } from "@/lib/query";
import { pageBody, serializeCustomer } from "@/lib/serialize";

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  const page = parsePagination(params);
  const result = await listCustomers({ q: textFilter(params, "q") }, page);
  return ok(pageBody(result, serializeCustomer));
});

export const POST = route(async (request) => {
  const customer = await createCustomer(await readBody(request));
  return created(serializeCustomer(customer));
});
