import { type Attrs, FieldErrors, readBool, readInt, readString } from "../validate";

export interface TechnicianAttrs {
  name: string;
  phone: string | null;
  skillTags: string[];
  hourlyCostCents: number;
  isActive: boolean;
}

function readSkillTags(
  input: Attrs,
  errors: FieldErrors,
): string[] | undefined {
  if (!("skill_tags" in input)) return undefined;
  const value = input["skill_tags"];
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string")) {
    errors.add("skill_tags", "skill_tags must be an array of strings");
    return undefined;
  }
  const tags = (value as string[]).map((tag) => tag.trim().toLowerCase());
  if (tags.some((tag) => tag.length < 1 || tag.length > 40)) {
    errors.add("skill_tags", "each skill tag must be 1-40 characters");
    return undefined;
  }
  // Stored canonically: lower-case, deduplicated, sorted.
  return [...new Set(tags)].sort();
}

export function parseTechnicianCreate(input: Attrs): TechnicianAttrs {
  const errors = new FieldErrors();
  const name = readString(input, "name", { max: 120, required: true }, errors);
  const phone = readString(input, "phone", { min: 7, max: 32, nullable: true }, errors);
  const skillTags = readSkillTags(input, errors);
  const hourlyCostCents = readInt(input, "hourly_cost_cents", { required: true }, errors);
  const isActive = readBool(input, "is_active", {}, errors);
  errors.throwIfAny();
  return {
    name: name as string,
    phone: phone ?? null,
    skillTags: skillTags ?? [],
    hourlyCostCents: hourlyCostCents as number,
    isActive: isActive ?? true,
  };
}

export function parseTechnicianUpdate(input: Attrs): Partial<TechnicianAttrs> {
  const errors = new FieldErrors();
  const name = readString(input, "name", { max: 120 }, errors);
  const phone = readString(input, "phone", { min: 7, max: 32, nullable: true }, errors);
  const skillTags = readSkillTags(input, errors);
  const hourlyCostCents = readInt(input, "hourly_cost_cents", {}, errors);
  const isActive = readBool(input, "is_active", {}, errors);
  errors.throwIfAny();

  const patch: Partial<TechnicianAttrs> = {};
  if (typeof name === "string") patch.name = name;
  if (phone !== undefined) patch.phone = phone;
  if (skillTags !== undefined) patch.skillTags = skillTags;
  if (hourlyCostCents !== undefined) patch.hourlyCostCents = hourlyCostCents;
  if (isActive !== undefined) patch.isActive = isActive;
  return patch;
}
