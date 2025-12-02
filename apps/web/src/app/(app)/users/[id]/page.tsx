import Link from "next/link";
import { notFound } from "next/navigation";

import { listTokens, prisma } from "@acme/db";

import { ActionButton } from "@/components/ActionButton";
import { DeleteForm } from "@/components/DeleteForm";
import { TokenIssuePanel } from "@/components/TokenIssuePanel";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

import { deleteUserAction, issueTokenAction, revokeTokenAction } from "../actions";

export default async function UserPage(props: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await props.params;
  const user = await prisma.user.findUnique({ where: { id: Number(id) || 0 } });
  if (!user) notFound();
  const tokens = await listTokens(user.id);

  return (
    <>
      <div className="page-head">
        <h1>{user.name}</h1>
        <div className="row-actions">
          <Link className="button secondary" href={`/users/${user.id}/edit`}>
            Edit
          </Link>
          {viewer.id !== user.id && (
            <DeleteForm
              action={deleteUserAction.bind(null, user.id)}
              confirmText={`Delete ${user.name}? Their api tokens stop working immediately.`}
            />
          )}
        </div>
      </div>

      <div className="card">
        <dl className="props">
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd>{user.role}</dd>
          <dt>Status</dt>
          <dd>{user.isActive ? "Active" : "Deactivated"}</dd>
          <dt>Added</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
      </div>

      <h2>API tokens</h2>
      {tokens.length === 0 ? (
        <p className="empty">No tokens issued for this user.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Issued</th>
              <th>Last used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td>{token.name}</td>
                <td>{formatDate(token.createdAt)}</td>
                <td>
                  {token.lastUsedAt ? (
                    formatDateTime(token.lastUsedAt)
                  ) : (
                    <span className="muted">never</span>
                  )}
                </td>
                <td>
                  <ActionButton
                    action={revokeTokenAction.bind(null, token.id, user.id)}
                    label="Revoke"
                    className="link"
                    confirmText={`Revoke “${token.name}”? Requests using it will start failing.`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Issue a token</h2>
      <TokenIssuePanel action={issueTokenAction.bind(null, user.id)} />
    </>
  );
}
