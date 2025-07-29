import { createUser, listUsers } from "@acme/db";

import { created, ok, readBody, route } from "@/lib/http";
import { boolFilter, parsePagination, roleFilter } from "@/lib/query";
import { pageBody, serializeUser } from "@/lib/serialize";

export const GET = route(
  async (request) => {
    const params = new URL(request.url).searchParams;
    const page = parsePagination(params);
    const result = await listUsers(
      { role: roleFilter(params), isActive: boolFilter(params, "is_active") },
      page,
    );
    return ok(pageBody(result, serializeUser));
  },
  { admin: true },
);

export const POST = route(
  async (request) => {
    const user = await createUser(await readBody(request));
    return created(serializeUser(user));
  },
  { admin: true },
);
