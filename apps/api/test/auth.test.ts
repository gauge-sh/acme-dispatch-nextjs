import { describe, expect, it } from "vitest";

import { issueToken, prisma } from "@acme/db";

import { GET as listCustomers } from "@/app/api/v1/customers/route";
import { GET as listUsers } from "@/app/api/v1/users/route";

import { body, createUser, ctx, errorOf, request, signIn } from "./helpers";

describe("bearer authentication", () => {
  it("rejects a missing authorization header", async () => {
    const response = await listCustomers(request("GET", "/api/v1/customers"), ctx());
    expect(response.status).toBe(401);
    expect(await errorOf(response)).toEqual({
      code: "unauthorized",
      message: "invalid or missing token",
    });
  });

  it("rejects a malformed header and an unknown token", async () => {
    for (const header of ["Basic abc123", "Bearer", "Bearer   ", "Bearer adk_wrong"]) {
      const raw = new Request("http://api.test/api/v1/customers", {
        headers: { authorization: header },
      });
      const response = await listCustomers(raw, ctx());
      expect(response.status, header).toBe(401);
    }
  });

  it("rejects a token whose user has been deactivated", async () => {
    const user = await createUser("dispatcher");
    const { plaintext } = await issueToken(user.id, { name: "ci" });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    const response = await listCustomers(
      request("GET", "/api/v1/customers", { token: plaintext }),
      ctx(),
    );
    expect(response.status).toBe(401);
  });

  it("stamps last_used_at on successful auth", async () => {
    const user = await createUser("dispatcher");
    const { token, plaintext } = await issueToken(user.id, { name: "ci" });
    expect(token.lastUsedAt).toBeNull();

    await listCustomers(request("GET", "/api/v1/customers", { token: plaintext }), ctx());
    const after = await prisma.apiToken.findUniqueOrThrow({ where: { id: token.id } });
    expect(after.lastUsedAt).not.toBeNull();
  });

  it("lets both roles read ordinary resources", async () => {
    for (const role of ["admin", "dispatcher"] as const) {
      const { token } = await signIn(role);
      const response = await listCustomers(
        request("GET", "/api/v1/customers", { token }),
        ctx(),
      );
      expect(response.status).toBe(200);
    }
  });
});

describe("role gating", () => {
  it("hides /users from dispatchers", async () => {
    const { token } = await signIn("dispatcher");
    const response = await listUsers(request("GET", "/api/v1/users", { token }), ctx());
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toEqual({
      code: "forbidden",
      message: "admin access required",
    });
  });

  it("opens /users to admins", async () => {
    const { token } = await signIn("admin");
    const response = await listUsers(request("GET", "/api/v1/users", { token }), ctx());
    expect(response.status).toBe(200);
    expect((await body(response))["total"]).toBe(1);
  });
});
