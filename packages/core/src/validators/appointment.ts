import { type Attrs, FieldErrors, readInt, readString, readTimestamp } from "../validate";

export interface AppointmentAttrs {
  jobId: number;
  technicianId: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  completionNotes: string | null;
}

export function parseAppointmentCreate(input: Attrs): AppointmentAttrs {
  const errors = new FieldErrors();
  const jobId = readInt(input, "job_id", { required: true }, errors);
  const technicianId = readInt(input, "technician_id", { required: true }, errors);
  const scheduledStart = readTimestamp(input, "scheduled_start", { required: true }, errors);
  const scheduledEnd = readTimestamp(input, "scheduled_end", { required: true }, errors);
  const completionNotes = readString(
    input,
    "completion_notes",
    { min: 0, max: 2000, nullable: true },
    errors,
  );
  errors.throwIfAny();
  return {
    jobId: jobId as number,
    technicianId: technicianId as number,
    scheduledStart: scheduledStart as Date,
    scheduledEnd: scheduledEnd as Date,
    completionNotes: completionNotes ?? null,
  };
}

export function parseAppointmentUpdate(input: Attrs): Partial<AppointmentAttrs> {
  const errors = new FieldErrors();
  const jobId = readInt(input, "job_id", {}, errors);
  const technicianId = readInt(input, "technician_id", {}, errors);
  const scheduledStart = readTimestamp(input, "scheduled_start", {}, errors);
  const scheduledEnd = readTimestamp(input, "scheduled_end", {}, errors);
  const completionNotes = readString(
    input,
    "completion_notes",
    { min: 0, max: 2000, nullable: true },
    errors,
  );
  errors.throwIfAny();

  const patch: Partial<AppointmentAttrs> = {};
  if (jobId !== undefined) patch.jobId = jobId;
  if (technicianId !== undefined) patch.technicianId = technicianId;
  if (scheduledStart !== undefined) patch.scheduledStart = scheduledStart;
  if (scheduledEnd !== undefined) patch.scheduledEnd = scheduledEnd;
  if (completionNotes !== undefined) patch.completionNotes = completionNotes;
  return patch;
}
