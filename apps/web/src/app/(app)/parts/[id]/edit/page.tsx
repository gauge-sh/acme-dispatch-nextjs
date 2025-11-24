import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { PartForm } from "@/components/forms/PartForm";

import { updatePartAction } from "../../actions";

export default async function EditPartPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const part = await prisma.part.findUnique({ where: { id: Number(id) || 0 } });
  if (!part) notFound();

  return (
    <>
      <h1>
        Edit {part.sku} — {part.name}
      </h1>
      <p className="muted">
        Price changes never restate old invoices; usage is billed at the price in
        effect when it was recorded.
      </p>
      <PartForm action={updatePartAction.bind(null, part.id)} part={part} />
    </>
  );
}
