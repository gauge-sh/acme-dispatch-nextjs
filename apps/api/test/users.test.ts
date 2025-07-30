import { describe, expect, it } from "vitest";

import { prisma } from "@acme/db";

import { GET as list, POST as create } from "@/app/api/v1/users/route";
import {
  DELETE as destroy,
  GET as show,
  PATCH as update,
} from "@/app/api/v1/users/[id]/route";

import { body, createUser, ctx, errorOf, request, signIn } from "./helpers";

describe("POST /users", () => {
  it("creates a dispatcher by default, lowercasing the email", async () => {
    const { token } = await signIn("admin");
    const response = await create(
      request("POST", "/api/v1/users", {
        token,
        body: { email: "New.Hire@Acme.example", name: "New Hire" },
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    expect(parsed["email"]).toBe("new.hire@acme.example");
    expect(parsed["role"]).toBe("dispatcher");
    expect(parsed["is_active"]).toBe(true);
    expect(parsed).not.toHaveProperty("password");
    expect(parsed).not.toHaveProperty("password_hash");
  });

  it("rejects a duplicate email case-insensitively", async () => {
    const { token } = await signIn("admin");
    await createUser("dispatcher", { email: "ray@acme.example" });
    const response = await create(
      request("POST", "/api/v1/users", {
        token,
        body: { email: "RAY@acme.example", name: "Ray Again" },
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("email is already in use");
  });

  it("is closed to dispatchers", async () => {
    const { token } = await signIn("dispatcher");
    const response = await create(
      request("POST", "/api/v1/users", {
        token,
        body: { email: "x@y.example", name: "X" },
      }),
      ctx(),
    );
    expect(response.status).toBe(403);
  });
});

describe("GET /users", () => {
  it("filters by role and is_active", async () => {
    const { token } = await signIn("admin");
    await createUser("dispatcher");
    await createUser("dispatcher", { isActive: false });

    const admins = await body(
      await list(request("GET", "/api/v1/users?role=admin", { token }), ctx()),
    );
    expect(admins["total"]).toBe(1);

    const inactive = await body(
      await list(request("GET", "/api/v1/users?is_active=false", { token }), ctx()),
    );
    expect(inactive["total"]).toBe(1);

    const junk = await list(request("GET", "/api/v1/users?role=owner", { token }), ctx());
    expect(junk.status).toBe(400);
    expect((await errorOf(junk)).message).toBe("unknown role");
  });
});

describe("PATCH /users/:id", () => {
  it("lets an admin change another user's role and active flag", async () => {
    const { token } = await signIn("admin");
    const target = await createUser("dispatcher");
    const response = await update(
      request("PATCH", `/api/v1/users/${target.id}`, {
        token,
        body: { role: "admin", is_active: false },
      }),
      ctx({ id: String(target.id) }),
    );
    expect(response.status).toBe(200);
    const parsed = await body(response);
    expect(parsed["role"]).toBe("admin");
    expect(parsed["is_active"]).toBe(false);
  });

  it("blocks changing your own role", async () => {
    const { user, token } = await signIn("admin");
    const response = await update(
      request("PATCH", `/api/v1/users/${user.id}`, {
        token,
        body: { role: "dispatcher" },
      }),
      ctx({ id: String(user.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("cannot change your own role");
  });

  it("blocks deactivating yourself", async () => {
    const { user, token } = await signIn("admin");
    await createUser("admin"); // another admin, so the last-admin rule is not in play
    const response = await update(
      request("PATCH", `/api/v1/users/${user.id}`, {
        token,
        body: { is_active: false },
      }),
      ctx({ id: String(user.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("cannot deactivate your own account");
  });

  it("accepts a no-op role patch on yourself", async () => {
    const { user, token } = await signIn("admin");
    const response = await update(
      request("PATCH", `/api/v1/users/${user.id}`, {
        token,
        body: { role: "admin", name: "Renamed Admin" },
      }),
      ctx({ id: String(user.id) }),
    );
    expect(response.status).toBe(200);
    expect((await body(response))["name"]).toBe("Renamed Admin");
  });
});

describe("DELETE /users/:id", () => {
  it("refuses to remove the last active admin", async () => {
    const { user, token } = await signIn("admin");
    const response = await destroy(
      request("DELETE", `/api/v1/users/${user.id}`, { token }),
      ctx({ id: String(user.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("cannot remove the last active admin");
  });

  it("deletes an admin when another active admin remains", async () => {
    const { token } = await signIn("admin");
    const other = await createUser("admin");
    const response = await destroy(
      request("DELETE", `/api/v1/users/${other.id}`, { token }),
      ctx({ id: String(other.id) }),
    );
    expect(response.status).toBe(204);
  });

  it("deletes a dispatcher and cascades their tokens", async () => {
    const { token } = await signIn("admin");
    const target = await signIn("dispatcher");
    const response = await destroy(
      request("DELETE", `/api/v1/users/${target.user.id}`, { token }),
      ctx({ id: String(target.user.id) }),
    );
    expect(response.status).toBe(204);
    expect(await prisma.apiToken.count({ where: { userId: target.user.id } })).toBe(0);
  });

  it("404s for a missing user", async () => {
    const { token } = await signIn("admin");
    const response = await show(
      request("GET", "/api/v1/users/999", { token }),
      ctx({ id: "999" }),
    );
    expect(response.status).toBe(404);
    expect((await errorOf(response)).message).toBe("user not found");
  });
});
