import { notFound } from "next/navigation";

import { parseSkillTags, prisma } from "@acme/db";

import { TechnicianForm } from "@/components/forms/TechnicianForm";

import { updateTechnicianAction } from "../../actions";

export default async function EditTechnicianPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const technician = await prisma.technician.findUnique({ where: { id: Number(id) || 0 } });
  if (!technician) notFound();

  return (
    <>
      <h1>Edit {technician.name}</h1>
      <TechnicianForm
        action={updateTechnicianAction.bind(null, technician.id)}
        technician={technician}
        skillTags={parseSkillTags(technician.skillTags)}
      />
    </>
  );
}
