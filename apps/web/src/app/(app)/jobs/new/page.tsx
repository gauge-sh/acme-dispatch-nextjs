import { prisma } from "@acme/db";

import { JobForm } from "@/components/forms/JobForm";

import { createJobAction } from "../actions";

export default async function NewJobPage() {
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <h1>New job</h1>
      <JobForm action={createJobAction} customers={customers} />
    </>
  );
}
