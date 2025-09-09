import { notFound } from "next/navigation";

import { prisma } from "@acme/db";

import { CustomerForm } from "@/components/forms/CustomerForm";

import { updateCustomerAction } from "../../actions";

export default async function EditCustomerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const customer = await prisma.customer.findUnique({ where: { id: Number(id) || 0 } });
  if (!customer) notFound();

  return (
    <>
      <h1>Edit {customer.name}</h1>
      <CustomerForm action={updateCustomerAction.bind(null, customer.id)} customer={customer} />
    </>
  );
}
