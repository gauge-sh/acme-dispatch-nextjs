"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn("credentials", { redirect: false, email, password });
    setBusy(false);
    if (result?.error) {
      setError("That email and password combination did not work.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>Acme Dispatch</h1>
        <p className="muted">Sign in with your staff account.</p>
        {error && <p className="form-error">{error}</p>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
