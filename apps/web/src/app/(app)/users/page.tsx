import Link from "next/link";

import { isRole } from "@acme/core";
import { listUsers } from "@acme/db";

import { Pager } from "@/components/Pager";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

const PER_PAGE = 25;

interface SearchParams {
  role?: string;
  is_active?: string;
  page?: string;
}

export default async function UsersPage(props: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await props.searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const role = params.role && isRole(params.role) ? params.role : undefined;
  const isActive =
    params.is_active === "true" ? true : params.is_active === "false" ? false : undefined;
  const result = await listUsers({ role, isActive }, { page, perPage: PER_PAGE });

  return (
    <>
      <div className="page-head">
        <h1>Users</h1>
        <Link className="button" href="/users/new">
          New user
        </Link>
      </div>

      <form className="filters" method="get">
        <label>
          Role
          <select name="role" defaultValue={role ?? ""}>
            <option value="">All</option>
            <option value="admin">admin</option>
            <option value="dispatcher">dispatcher</option>
          </select>
        </label>
        <label>
          Status
          <select name="is_active" defaultValue={params.is_active ?? ""}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="empty">No users match those filters.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((user) => (
              <tr key={user.id}>
                <td>
                  <Link href={`/users/${user.id}`}>{user.name}</Link>
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.isActive ? "Active" : <span className="badge inactive">deactivated</span>}
                </td>
                <td>{formatDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/users"
        query={{ role, is_active: params.is_active }}
      />
    </>
  );
}
