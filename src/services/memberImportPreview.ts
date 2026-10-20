import { normalizeDateValue } from "../lib/dataFormat";
import type { MemberStatus } from "../types";

export type MemberImportPreviewIssueCode =
  | "ROW_TYPE"
  | "UNKNOWN_FIELD"
  | "REQUIRED"
  | "TYPE"
  | "LENGTH"
  | "VALUE"
  | "DATE";

export interface MemberImportPreviewIssue {
  field: string | null;
  code: MemberImportPreviewIssueCode;
}

export interface MemberImportPreviewData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  baptismDate: string;
  status: MemberStatus;
  isTither: boolean;
  notes: string;
}

export interface MemberImportPreviewValidRow {
  index: number;
  status: "valid";
  data: MemberImportPreviewData;
}

export interface MemberImportPreviewInvalidRow {
  index: number;
  status: "invalid";
  issues: MemberImportPreviewIssue[];
}

export type MemberImportPreviewRow =
  | MemberImportPreviewValidRow
  | MemberImportPreviewInvalidRow;

export interface MemberImportPreviewResult {
  rowCount: number;
  validCount: number;
  invalidCount: number;
  canImport: boolean;
  rows: MemberImportPreviewRow[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isDraftDateValid(trimmed: string): boolean {
  if (!DATE_PATTERN.test(trimmed)) {
    return false;
  }
  const year = Number(trimmed.slice(0, 4));
  if (!Number.isInteger(year) || year < 100 || year > 9999) {
    return false;
  }
  return normalizeDateValue(trimmed) === trimmed;
}

export function previewMemberImportJson(text: unknown): MemberImportPreviewResult {
  if (typeof text !== "string") {
    throw new TypeError("INVALID_MEMBER_IMPORT_INPUT");
  }
  if (text.length > 200000) {
    throw new RangeError("MEMBER_IMPORT_LIMIT");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("INVALID_MEMBER_IMPORT_JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError("INVALID_MEMBER_IMPORT_ROOT");
  }
  if (parsed.length > 250) {
    throw new RangeError("MEMBER_IMPORT_LIMIT");
  }
  const rows: MemberImportPreviewRow[] = [];
  let validCount = 0;
  for (let index = 0; index < parsed.length; index += 1) {
    const raw = parsed[index];
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      const issues: MemberImportPreviewIssue[] = [{ field: null, code: "ROW_TYPE" }];
      rows.push({ index, status: "invalid", issues });
      continue;
    }
    const record = raw as Record<string, unknown>;
    const issues: MemberImportPreviewIssue[] = [];
    const keys = Object.keys(record);
    let unknownFound = false;
    for (const k of keys) {
      if (
        k !== "fullName" &&
        k !== "email" &&
        k !== "phone" &&
        k !== "address" &&
        k !== "birthDate" &&
        k !== "baptismDate" &&
        k !== "status" &&
        k !== "isTither" &&
        k !== "notes" &&
        k !== "id" &&
        k !== "createdAt"
      ) {
        unknownFound = true;
        break;
      }
    }
    if (unknownFound) {
      issues.push({ field: null, code: "UNKNOWN_FIELD" });
    }
    let fullNameOut = "";
    if (!hasOwn(record, "fullName")) {
      issues.push({ field: "fullName", code: "REQUIRED" });
    } else {
      const v = record["fullName"];
      if (typeof v !== "string") {
        issues.push({ field: "fullName", code: "TYPE" });
      } else if (v.length > 120) {
        issues.push({ field: "fullName", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "fullName", code: "VALUE" });
      } else {
        const t = v.trim();
        if (t === "") {
          issues.push({ field: "fullName", code: "REQUIRED" });
        } else {
          fullNameOut = t;
        }
      }
    }
    let emailOut = "";
    if (hasOwn(record, "email")) {
      const v = record["email"];
      if (typeof v !== "string") {
        issues.push({ field: "email", code: "TYPE" });
      } else if (v.length > 254) {
        issues.push({ field: "email", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "email", code: "VALUE" });
      } else {
        emailOut = v.trim();
      }
    }
    let phoneOut = "";
    if (hasOwn(record, "phone")) {
      const v = record["phone"];
      if (typeof v !== "string") {
        issues.push({ field: "phone", code: "TYPE" });
      } else if (v.length > 40) {
        issues.push({ field: "phone", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "phone", code: "VALUE" });
      } else {
        phoneOut = v.trim();
      }
    }
    let addressOut = "";
    if (hasOwn(record, "address")) {
      const v = record["address"];
      if (typeof v !== "string") {
        issues.push({ field: "address", code: "TYPE" });
      } else if (v.length > 500) {
        issues.push({ field: "address", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "address", code: "VALUE" });
      } else {
        addressOut = v.trim();
      }
    }
    let birthDateOut = "";
    if (hasOwn(record, "birthDate")) {
      const v = record["birthDate"];
      if (typeof v !== "string") {
        issues.push({ field: "birthDate", code: "TYPE" });
      } else if (v.length > 32) {
        issues.push({ field: "birthDate", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "birthDate", code: "VALUE" });
      } else {
        const t = v.trim();
        if (t === "") {
          birthDateOut = "";
        } else if (!isDraftDateValid(t)) {
          issues.push({ field: "birthDate", code: "DATE" });
        } else {
          birthDateOut = t;
        }
      }
    }
    let baptismDateOut = "";
    if (hasOwn(record, "baptismDate")) {
      const v = record["baptismDate"];
      if (typeof v !== "string") {
        issues.push({ field: "baptismDate", code: "TYPE" });
      } else if (v.length > 32) {
        issues.push({ field: "baptismDate", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "baptismDate", code: "VALUE" });
      } else {
        const t = v.trim();
        if (t === "") {
          baptismDateOut = "";
        } else if (!isDraftDateValid(t)) {
          issues.push({ field: "baptismDate", code: "DATE" });
        } else {
          baptismDateOut = t;
        }
      }
    }
    let statusOut: MemberStatus = "Ativo";
    if (hasOwn(record, "status")) {
      const v = record["status"];
      if (typeof v !== "string") {
        issues.push({ field: "status", code: "TYPE" });
      } else if (v !== "Ativo" && v !== "Inativo" && v !== "Visitante") {
        issues.push({ field: "status", code: "VALUE" });
      } else {
        statusOut = v;
      }
    }
    let isTitherOut = false;
    if (hasOwn(record, "isTither")) {
      const v = record["isTither"];
      if (typeof v !== "boolean") {
        issues.push({ field: "isTither", code: "TYPE" });
      } else {
        isTitherOut = v;
      }
    }
    let notesOut = "";
    if (hasOwn(record, "notes")) {
      const v = record["notes"];
      if (typeof v !== "string") {
        issues.push({ field: "notes", code: "TYPE" });
      } else if (v.length > 2000) {
        issues.push({ field: "notes", code: "LENGTH" });
      } else if (v.includes("\u0000")) {
        issues.push({ field: "notes", code: "VALUE" });
      } else {
        notesOut = v;
      }
    }
    if (issues.length === 0) {
      validCount += 1;
      const data: MemberImportPreviewData = {
        fullName: fullNameOut,
        email: emailOut,
        phone: phoneOut,
        address: addressOut,
        birthDate: birthDateOut,
        baptismDate: baptismDateOut,
        status: statusOut,
        isTither: isTitherOut,
        notes: notesOut,
      };
      rows.push({ index, status: "valid", data });
    } else {
      rows.push({ index, status: "invalid", issues });
    }
  }
  const rowCount = parsed.length;
  const invalidCount = rowCount - validCount;
  const canImport = rowCount > 0 && invalidCount === 0;
  return { rowCount, validCount, invalidCount, canImport, rows };
}
