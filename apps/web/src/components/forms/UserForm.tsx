"use client";

import { useActionState } from "react";

import { ROLES } from "@acme/core";
import type { User } from "@acme/db";

import type { ActionState } from "@/lib/forms";

interface UserFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  user?: User;
  isSelf?: boolean;
}

export function UserForm({ action, user, isSelf }: UserFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="stack" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Email
        <input name="email" type="email" defaultValue={user?.email} required />
        {fields["email"] && <span className="muted">{fields["email"]}</span>}
      </label>
      <label>
        Name
        <input name="name" defaultValue={user?.name} required maxLength={120} />
        {fields["name"] && <span className="muted">{fields["name"]}</span>}
      </label>
      {isSelf ? (
        <p className="muted">
          You cannot change your own role or deactivate your own account.
        </p>
      ) : (
        <>
          <label>
            Role
            <select name="role" defaultValue={user?.role ?? "dispatcher"}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {fields["role"] && <span className="muted">{fields["role"]}</span>}
          </label>
          <label>
            Status
            <select name="is_active" defaultValue={user?.isActive === false ? "false" : "true"}>
              <option value="true">Active</option>
              <option value="false">Deactivated — cannot sign in or use tokens</option>
            </select>
            {fields["is_active"] && <span className="muted">{fields["is_active"]}</span>}
          </label>
        </>
      )}
      <label>
        {user ? "New password (leave blank to keep)" : "Password"}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required={!user}
          minLength={8}
        />
        {fields["password"] && <span className="muted">{fields["password"]}</span>}
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {user ? "Save changes" : "Create user"}
        </button>
      </div>
    </form>
  );
}
