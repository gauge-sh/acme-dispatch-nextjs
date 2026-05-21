import { isRole, type Role } from "../enums";
import {
  type Attrs,
  FieldErrors,
  readBool,
  readEmail,
  readEnum,
  readPassword,
  readString,
} from "../validate";

export interface UserAttrs {
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  /** Absent means "no password set"; present-but-null on update means "no change". */
  password?: string;
}

const PASSWORD_MIN_LENGTH = 8;

export function parseUserCreate(input: Attrs): UserAttrs {
  const errors = new FieldErrors();
  const email = readEmail(input, "email", { required: true, lowercase: true }, errors);
  const name = readString(input, "name", { max: 120, required: true }, errors);
  const role = readEnum(input, "role", { guard: isRole, label: "role" }, errors);
  const isActive = readBool(input, "is_active", {}, errors);
  const password = readPassword(input, "password", { min: PASSWORD_MIN_LENGTH }, errors);
  errors.throwIfAny();
  return {
    email: email as string,
    name: name as string,
    role: role ?? "dispatcher",
    isActive: isActive ?? true,
    password,
  };
}

export function parseUserUpdate(input: Attrs): Partial<UserAttrs> {
  const errors = new FieldErrors();
  const email = readEmail(input, "email", { lowercase: true }, errors);
  const name = readString(input, "name", { max: 120 }, errors);
  const role = readEnum(input, "role", { guard: isRole, label: "role" }, errors);
  const isActive = readBool(input, "is_active", {}, errors);
  const password = readPassword(input, "password", { min: PASSWORD_MIN_LENGTH }, errors);
  errors.throwIfAny();

  const patch: Partial<UserAttrs> = {};
  if (typeof email === "string") patch.email = email;
  if (typeof name === "string") patch.name = name;
  if (role !== undefined) patch.role = role;
  if (isActive !== undefined) patch.isActive = isActive;
  if (password !== undefined) patch.password = password;
  return patch;
}

export function parseTokenCreate(input: Attrs): { name: string } {
  const errors = new FieldErrors();
  const name = readString(input, "name", { max: 80, required: true }, errors);
  errors.throwIfAny();
  return { name: name as string };
}
