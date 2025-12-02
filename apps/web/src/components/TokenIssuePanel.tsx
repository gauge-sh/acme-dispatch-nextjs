"use client";

import { useActionState } from "react";

import type { TokenIssueState } from "@/app/(app)/users/actions";

interface TokenIssuePanelProps {
  action: (state: TokenIssueState | null, data: FormData) => Promise<TokenIssueState>;
}

export function TokenIssuePanel({ action }: TokenIssuePanelProps) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <div>
      {state?.plaintext && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p className="form-ok">
            Token “{state.tokenName}” issued. Copy it now — it is shown only once and
            only a hash is stored.
          </p>
          <p className="token-reveal">{state.plaintext}</p>
        </div>
      )}
      <form className="inline-form" action={formAction}>
        {state?.error && <p className="form-error">{state.error}</p>}
        <label>
          Token name
          <input name="name" required maxLength={80} placeholder="reporting script" />
        </label>
        <button type="submit" disabled={pending}>
          Issue token
        </button>
      </form>
    </div>
  );
}
