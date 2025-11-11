import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { JobForm } from "@/components/forms/JobForm";

import { updateJobAction } from "../../actions";

export default async function EditJobPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [job, customers] = await Promise.all([
    prisma.job.findUnique({ where: { id: Number(id) || 0 } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!job) notFound();

  return (
    <>
      <h1>Edit job #{job.id}</h1>
      <p className="muted">Status changes happen from the job page, not here.</p>
      <JobForm action={updateJobAction.bind(null, job.id)} customers={customers} job={job} />
    </>
  );
}
