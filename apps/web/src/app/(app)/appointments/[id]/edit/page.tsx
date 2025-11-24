import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { AppointmentForm } from "@/components/forms/AppointmentForm";

import { rescheduleAppointmentAction } from "../../actions";

export default async function EditAppointmentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const appointment = await prisma.appointment.findUnique({
    where: { id: Number(id) || 0 },
    include: { job: true },
  });
  if (!appointment) notFound();

  const technicians = await prisma.technician.findMany({
    where: { OR: [{ isActive: true }, { id: appointment.technicianId }] },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <h1>
        Reschedule visit for{" "}
        <Link href={`/jobs/${appointment.jobId}`}>{appointment.job.title}</Link>
      </h1>
      <AppointmentForm
        action={rescheduleAppointmentAction.bind(null, appointment.id)}
        technicians={technicians}
        appointment={appointment}
        submitLabel="Save changes"
      />
    </>
  );
}
