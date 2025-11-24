import { PartForm } from "@/components/forms/PartForm";

import { createPartAction } from "../actions";

export default function NewPartPage() {
  return (
    <>
      <h1>Add part</h1>
      <p className="muted">New parts start with zero stock; adjust after receiving.</p>
      <PartForm action={createPartAction} />
    </>
  );
}
