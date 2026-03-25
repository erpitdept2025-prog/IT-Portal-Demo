/**
 * lib/audit/customer-audit.ts
 */

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type CustomerAuditAction =
  | "transfer"
  | "create"
  | "update"
  | "delete"
  | "autoid";

export interface AuditActor {
  uid?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  referenceId?: string | null;
}

/** One entry covers all three fields transferred in a single dialog confirm. */
export interface TransferDetail {
  tsa?: {
    fromId?: string | null;
    fromName?: string | null;
    toId?: string | null;
    toName?: string | null;
  } | null;
  tsm?: { fromName?: string | null; toName?: string | null } | null;
  manager?: { fromName?: string | null; toName?: string | null } | null;
}

export interface CustomerAuditPayload {
  action: CustomerAuditAction;
  affectedCount?: number;
  customerId?: string | null;
  customerName?: string | null;
  transfer?: TransferDetail | null;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
  actor: AuditActor;
  context?: { page?: string; source?: string; bulk?: boolean } | null;
}

const COLLECTION = "taskflow_customer_audit_logs";
const AUDIT_SESSIONS_COLLECTION = "audit_sessions";

export interface DuplicateDetail {
  type: "within" | "across";
  matchedWith: number[];
}

export interface AuditSessionPayload {
  auditDate: any;
  userId: string;
  userName: string;
  userEmail: string;
  userReferenceId: string;
  auditType: "customer_database_audit";
  totalIssues: number;
  duplicateCount: number;
  missingTypeCount: number;
  missingStatusCount: number;
  issues: any[];
  duplicateDetails: Record<number, DuplicateDetail>;
  context: {
    page: string;
    source?: string;
    bulk?: boolean;
  };
}

export async function logCustomerAudit(
  payload: CustomerAuditPayload,
): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...payload,
      transfer: payload.transfer ?? null,
      changes: payload.changes ?? null,
      customerId: payload.customerId ?? null,
      customerName: payload.customerName ?? null,
      affectedCount: payload.affectedCount ?? 1,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("[CustomerAudit] Failed to write log:", err);
  }
}

/**
 * Logs a complete audit session to Firestore for permanent record and review
 */
export async function logAuditSession(
  payload: AuditSessionPayload,
): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, AUDIT_SESSIONS_COLLECTION), {
      auditDate: payload.auditDate ?? serverTimestamp(),
      userId: payload.userId,
      userName: payload.userName,
      userEmail: payload.userEmail,
      userReferenceId: payload.userReferenceId,
      auditType: payload.auditType,
      totalIssues: payload.totalIssues,
      duplicateCount: payload.duplicateCount,
      missingTypeCount: payload.missingTypeCount,
      missingStatusCount: payload.missingStatusCount,
      issues: payload.issues ?? [],
      duplicateDetails: payload.duplicateDetails ?? {},
      context: payload.context,
      timestamp: serverTimestamp(),
    });
    console.log("[AuditSession] Successfully logged audit session:", docRef.id);
    return docRef.id;
  } catch (err) {
    console.error("[AuditSession] Failed to log audit session:", err);
    return null;
  }
}
