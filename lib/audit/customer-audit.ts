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
