import { TechnicianForm } from "@/components/forms/TechnicianForm";

import { createTechnicianAction } from "../actions";

export default function NewTechnicianPage() {
  return (
    <>
      <h1>Add technician</h1>
      <TechnicianForm action={createTechnicianAction} />
    </>
  );
}
