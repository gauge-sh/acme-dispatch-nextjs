import { CustomerForm } from "@/components/forms/CustomerForm";

import { createCustomerAction } from "../actions";

export default function NewCustomerPage() {
  return (
    <>
      <h1>New customer</h1>
      <CustomerForm action={createCustomerAction} />
    </>
  );
}
