import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { UserForm } from "@/components/forms/UserForm";
import { requireAdmin } from "@/lib/session";

import { updateUserAction } from "../../actions";

export default async function EditUserPage(props: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await props.params;
  const user = await prisma.user.findUnique({ where: { id: Number(id) || 0 } });
  if (!user) notFound();

  return (
    <>
      <h1>Edit {user.name}</h1>
      <UserForm
        action={updateUserAction.bind(null, user.id)}
        user={user}
        isSelf={viewer.id === user.id}
      />
    </>
  );
}
