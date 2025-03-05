import { isPriority, type Priority } from "../enums";
import { type Attrs, FieldErrors, readEnum, readInt, readString } from "../validate";

export interface JobAttrs {
  customerId: number;
  title: string;
  description: string | null;
  priority: Priority;
}

// `status` never passes through here: create starts at `requested` and update
// leaves it alone, per the API contract's "ignored rather than erroring".

export function parseJobCreate(input: Attrs): JobAttrs {
  const errors = new FieldErrors();
  const customerId = readInt(input, "customer_id", { required: true }, errors);
  const title = readString(input, "title", { max: 160, required: true }, errors);
  const description = readString(
    input,
    "description",
    { min: 0, max: 4000, nullable: true },
    errors,
  );
  const priority = readEnum(input, "priority", { guard: isPriority, label: "priority" }, errors);
  errors.throwIfAny();
  return {
    customerId: customerId as number,
    title: title as string,
    description: description ?? null,
    priority: priority ?? "normal",
  };
}

export function parseJobUpdate(input: Attrs): Partial<JobAttrs> {
  const errors = new FieldErrors();
  const customerId = readInt(input, "customer_id", {}, errors);
  const title = readString(input, "title", { max: 160 }, errors);
  const description = readString(
    input,
    "description",
    { min: 0, max: 4000, nullable: true },
    errors,
  );
  const priority = readEnum(input, "priority", { guard: isPriority, label: "priority" }, errors);
  errors.throwIfAny();

  const patch: Partial<JobAttrs> = {};
  if (customerId !== undefined) patch.customerId = customerId;
  if (typeof title === "string") patch.title = title;
  if (description !== undefined) patch.description = description;
  if (priority !== undefined) patch.priority = priority;
  return patch;
}
