import { describe, expect, it } from "vitest";

import { POST as createCustomer } from "@/app/api/v1/customers/route";
import { POST as transition } from "@/app/api/v1/jobs/[id]/transition/route";

import { ctx, errorOf, makeCustomer, makeJob, signIn } from "./helpers";

function raw(url: string, token: string, body: string): Request {
  return new Request(`http://api.test${url}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body,
  });
}

describe("request bodies", () => {
  it("rejects unparseable json", async () => {
    const { token } = await signIn();
    const response = await createCustomer(raw("/api/v1/customers", token, "{nope"), ctx());
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toEqual({
      code: "validation_failed",
      message: "invalid request body",
    });
  });

  it("rejects arrays and scalars", async () => {
    const { token } = await signIn();
    for (const body of ["[1,2]", '"a string"', "42", "null", "true"]) {
      const response = await createCustomer(raw("/api/v1/customers", token, body), ctx());
      expect(response.status, body).toBe(400);
      expect((await errorOf(response)).message).toBe("invalid request body");
    }
  });

  it("rejects an empty body", async () => {
    const { token } = await signIn();
    const response = await createCustomer(raw("/api/v1/customers", token, ""), ctx());
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("invalid request body");
  });

  it("rejects a transition body without a status string", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    for (const body of ["{}", '{"status": 3}', '{"status": null}']) {
      const response = await transition(
        raw(`/api/v1/jobs/${job.id}/transition`, token, body),
        ctx({ id: String(job.id) }),
      );
      expect(response.status, body).toBe(400);
      expect((await errorOf(response)).message).toBe("unknown status");
    }
  });

  it("rejects a missing or wrong content type", async () => {
    const { token } = await signIn();
    for (const contentType of [undefined, "text/plain", "multipart/form-data"]) {
      const headers: Record<string, string> = { authorization: `Bearer ${token}` };
      if (contentType) headers["content-type"] = contentType;
      const response = await createCustomer(
        new Request("http://api.test/api/v1/customers", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: "X", service_address: "1 Elm" }),
        }),
        ctx(),
      );
      expect(response.status, String(contentType)).toBe(400);
      expect((await errorOf(response)).message).toBe("requests must be application/json");
    }
  });

  it("ignores unknown keys instead of erroring", async () => {
    const { token } = await signIn();
    const response = await createCustomer(
      raw(
        "/api/v1/customers",
        token,
        JSON.stringify({
          name: "Extra Keys Inc",
          service_address: "1 Extra Way",
          shoe_size: 11,
        }),
      ),
      ctx(),
    );
    expect(response.status).toBe(201);
  });
});
