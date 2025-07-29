import { deleteUser, getUser, updateUser } from "@acme/db";

import { idParam, noContent, ok, readBody, route } from "@/lib/http";
import { serializeUser } from "@/lib/serialize";

export const GET = route(
  async (_request, context) => {
    const id = await idParam(context, "user");
    return ok(serializeUser(await getUser(id)));
  },
  { admin: true },
);

export const PATCH = route(
  async (request, context, actor) => {
    const id = await idParam(context, "user");
    const user = await updateUser(id, await readBody(request), actor.id);
    return ok(serializeUser(user));
  },
  { admin: true },
);

export const DELETE = route(
  async (_request, context) => {
    const id = await idParam(context, "user");
    await deleteUser(id);
    return noContent();
  },
  { admin: true },
);
