import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/SignOutButton";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          Acme Dispatch
        </Link>
        <nav>
          <Link href="/jobs">Jobs</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/technicians">Technicians</Link>
          <Link href="/parts">Parts</Link>
          <Link href="/invoices">Invoices</Link>
          {user.role === "admin" && <Link href="/users">Users</Link>}
        </nav>
        <span className="whoami">
          {user.name}
          <SignOutButton />
        </span>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
