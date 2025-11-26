import { UserForm } from "@/components/forms/UserForm";
import { requireAdmin } from "@/lib/session";

import { createUserAction } from "../actions";

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <>
      <h1>New user</h1>
      <UserForm action={createUserAction} />
    </>
  );
}
