import { type Attrs, DomainError, NotFound, ValidationFailed } from "@acme/core";
import type { User } from "@acme/db";

import { authenticate } from "./auth";

const HTTP_STATUS: Record<string, number> = {
  validation_failed: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_transition: 409,
  schedule_conflict: 409,
  insufficient_stock: 409,
};

export function errorResponse(
  code: string,
  message: string,
  fields?: Record<string, string>,
): Response {
  const error: Record<string, unknown> = { code, message };
  if (fields && Object.keys(fields).length > 0) {
    error["fields"] = fields;
  }
  return Response.json({ error }, { status: HTTP_STATUS[code] ?? 500 });
}

export interface RouteContext {
  params: Promise<Record<string, string | undefined>>;
}

type Handler = (
  request: Request,
  context: RouteContext,
  user: User,
) => Promise<Response>;

export function route(fn: Handler, options: { admin?: boolean } = {}) {
  return async (request: Request, context: RouteContext): Promise<Response> => {
    const user = await authenticate(request);
    if (!user) {
      return errorResponse("unauthorized", "invalid or missing token");
    }
    if (options.admin && user.role !== "admin") {
      return errorResponse("forbidden", "admin access required");
    }
    try {
      return await fn(request, context, user);
    } catch (error) {
      if (error instanceof DomainError) {
        return errorResponse(error.code, error.message, error.fields);
      }
      console.error(error);
      return errorResponse("internal_error", "internal server error");
    }
  };
}

export async function readBody(request: Request): Promise<Attrs> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ValidationFailed("requests must be application/json");
  }
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new ValidationFailed("invalid request body");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ValidationFailed("invalid request body");
  }
  return parsed as Attrs;
}

/** Route ids are integers; anything else is simply not a resource. */
export async function idParam(
  context: RouteContext,
  entity: string,
  key = "id",
): Promise<number> {
  const params = await context.params;
  const raw = params[key];
  if (raw === undefined || !/^\d+$/.test(raw)) {
    throw new NotFound(`${entity} not found`);
  }
  return Number(raw);
}

export function ok(body: unknown): Response {
  return Response.json(body, { status: 200 });
}

export function created(body: unknown): Response {
  return Response.json(body, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
