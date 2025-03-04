import { type Attrs, FieldErrors, readEmail, readString } from "../validate";

export interface CustomerAttrs {
  name: string;
  contactEmail: string | null;
  phone: string | null;
  serviceAddress: string;
  notes: string | null;
}

export function parseCustomerCreate(input: Attrs): CustomerAttrs {
  const errors = new FieldErrors();
  const name = readString(input, "name", { max: 160, required: true }, errors);
  const contactEmail = readEmail(input, "contact_email", { nullable: true }, errors);
  const phone = readString(input, "phone", { min: 7, max: 32, nullable: true }, errors);
  const serviceAddress = readString(
    input,
    "service_address",
    { max: 240, required: true },
    errors,
  );
  const notes = readString(input, "notes", { min: 0, max: 2000, nullable: true }, errors);
  errors.throwIfAny();
  return {
    name: name as string,
    contactEmail: contactEmail ?? null,
    phone: phone ?? null,
    serviceAddress: serviceAddress as string,
    notes: notes ?? null,
  };
}

export function parseCustomerUpdate(input: Attrs): Partial<CustomerAttrs> {
  const errors = new FieldErrors();
  const name = readString(input, "name", { max: 160 }, errors);
  const contactEmail = readEmail(input, "contact_email", { nullable: true }, errors);
  const phone = readString(input, "phone", { min: 7, max: 32, nullable: true }, errors);
  const serviceAddress = readString(input, "service_address", { max: 240 }, errors);
  const notes = readString(input, "notes", { min: 0, max: 2000, nullable: true }, errors);
  errors.throwIfAny();

  const patch: Partial<CustomerAttrs> = {};
  if (typeof name === "string") patch.name = name;
  if (contactEmail !== undefined) patch.contactEmail = contactEmail;
  if (phone !== undefined) patch.phone = phone;
  if (typeof serviceAddress === "string") patch.serviceAddress = serviceAddress;
  if (notes !== undefined) patch.notes = notes;
  return patch;
}
