import { authenticateToken, type User } from "@acme/db";

export async function authenticate(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) return null;
  return authenticateToken(token);
}
