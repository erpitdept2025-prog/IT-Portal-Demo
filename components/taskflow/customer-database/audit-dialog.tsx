"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditKey = "duplicates" | "missingType" | "missingStatus";
type AuditFilter = "" | "all" | AuditKey;

interface DuplicateDetail {
  type: "within" | "across";
  matchedWith: number[];
}

interface Customer {
  id: number;
  account_reference_number: string;
  company_name: string;
  contact_person: string;
  contact_number: string;
  email_address: string;
  address: string;
  region: string;
  type_client: string;
  referenceid: string;
  tsm: string;
  manager: string;
  status: string;
  remarks: string;
  date_created: string;
  date_updated: string;
  next_available_date?: string;
}

interface AuditDialogProps {
  showAuditDialog: boolean;
  setShowAuditDialogAction: React.Dispatch<React.SetStateAction<boolean>>;
  audited: Customer[];
  duplicateIds: Set<number>;
  auditSelection: Record<AuditKey, boolean>;
  toggleAuditSelectionAction: (key: AuditKey) => void;
  setAuditFilterAction: React.Dispatch<React.SetStateAction<AuditFilter>>;
  setCustomersAction: React.Dispatch<React.SetStateAction<Customer[]>>;
  duplicateDetails?: Map<number, DuplicateDetail>;
}

interface CollapsibleCardProps {
  title: string;
  badge: { count: number; color: string };
  isChecked: boolean;
  onCheckChange: () => void;
  children: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  badge,
  isChecked,
  onCheckChange,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onCheckChange}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          />
          <span className="font-medium text-sm">{title}</span>
          <span className={cn("text-xs font-semibold px-2 py-1 rounded", badge.color)}>
            {badge.count}
          </span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform flex-shrink-0", {
            "rotate-180": isExpanded,
          })}
        />
      </button>

      {isExpanded && <div className="max-h-48 overflow-y-auto border-t p-2 bg-muted/50 text-xs space-y-1">
        {children}
      </div>}
    </div>
  );
};

export const AuditDialog: React.FC<AuditDialogProps> = ({
  showAuditDialog,
  setShowAuditDialogAction,
  audited,
  duplicateIds,
  auditSelection,
  toggleAuditSelectionAction,
  setAuditFilterAction,
  setCustomersAction,
  duplicateDetails,
}) => {
  const missingTypeCount = audited.filter((c) => !c.type_client?.trim() && c.status?.trim()).length;
  const missingStatusCount = audited.filter((c) => !c.status?.trim() && c.type_client?.trim()).length;

  return (
    (audited.length > 0 || duplicateIds.size > 0) && (
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialogAction}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Summary Details</DialogTitle>
            <DialogDescription>
              Terminal-style console displaying detected issues. Check to include in audit filter:
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {duplicateIds.size > 0 && (
              <CollapsibleCard
                title="Duplicates"
                badge={{ count: duplicateIds.size, color: "bg-red-100 text-red-700" }}
                isChecked={auditSelection.duplicates}
                onCheckChange={() => toggleAuditSelectionAction("duplicates")}
              >
                {Array.from(duplicateIds).map((id) => {
                  const customer = audited.find((c) => c.id === id);
                  const detail = duplicateDetails?.get(id);
                  return (
                    <div key={id} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="font-mono text-xs text-foreground">
                        <span className="text-cyan-600">[ID: {id}]</span> {customer?.company_name}
                        {detail && (
                          <span className={cn("ml-2", detail.type === "within" ? "text-orange-600" : "text-red-600")}>
                            ({detail.type})
                          </span>
                        )}
                      </div>
                      {detail && (
                        <div className="text-xs text-muted-foreground ml-2 mt-1">
                          Matched with: {detail.matchedWith.join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CollapsibleCard>
            )}

            {missingTypeCount > 0 && (
              <CollapsibleCard
                title="Missing Type"
                badge={{ count: missingTypeCount, color: "bg-yellow-100 text-yellow-700" }}
                isChecked={auditSelection.missingType}
                onCheckChange={() => toggleAuditSelectionAction("missingType")}
              >
                {audited
                  .filter((c) => !c.type_client?.trim() && c.status?.trim())
                  .map((customer) => (
                    <div key={customer.id} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="font-mono text-xs text-foreground">
                        <span className="text-cyan-600">[ID: {customer.id}]</span> {customer.company_name}
                      </div>
                      <div className="text-xs text-muted-foreground ml-2 mt-1">
                        Status: {customer.status}
                      </div>
                    </div>
                  ))}
              </CollapsibleCard>
            )}

            {missingStatusCount > 0 && (
              <CollapsibleCard
                title="Missing Status"
                badge={{ count: missingStatusCount, color: "bg-yellow-100 text-yellow-700" }}
                isChecked={auditSelection.missingStatus}
                onCheckChange={() => toggleAuditSelectionAction("missingStatus")}
              >
                {audited
                  .filter((c) => !c.status?.trim() && c.type_client?.trim())
                  .map((customer) => (
                    <div key={customer.id} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="font-mono text-xs text-foreground">
                        <span className="text-cyan-600">[ID: {customer.id}]</span> {customer.company_name}
                      </div>
                      <div className="text-xs text-muted-foreground ml-2 mt-1">
                        Type: {customer.type_client}
                      </div>
                    </div>
                  ))}
              </CollapsibleCard>
            )}
          </div>
              </label>
            )}
            {audited.some((c) => !c.type_client?.trim() && c.status?.trim()) && (
              <label className="flex justify-between items-center gap-2">
                <span>Missing Type:</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-yellow-600">
                    {audited.filter((c) => !c.type_client?.trim() && c.status?.trim()).length}
                  </span>
                  <input
                    type="checkbox"
                    checked={auditSelection.missingType}
                    onChange={() => toggleAuditSelectionAction("missingType")}
                  />
                </div>
              </label>
            )}
            {audited.some((c) => !c.status?.trim() && c.type_client?.trim()) && (
              <label className="flex justify-between items-center gap-2">
                <span>Missing Status:</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-yellow-600">
                    {audited.filter((c) => !c.status?.trim() && c.type_client?.trim()).length}
                  </span>
                  <input
                    type="checkbox"
                    checked={auditSelection.missingStatus}
                    onChange={() => toggleAuditSelectionAction("missingStatus")}
                  />
                </div>
              </label>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAuditDialogAction(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                setShowAuditDialogAction(false);

                if (auditSelection.duplicates) setAuditFilterAction("duplicates");
                else if (auditSelection.missingType) setAuditFilterAction("missingType");
                else if (auditSelection.missingStatus) setAuditFilterAction("missingStatus");
                else setAuditFilterAction("all");

                // Bulk update type_client if "Missing Type" is checked
                if (auditSelection.missingType) {
                  const missingTypeIds = audited
                    .filter((c) => !c.type_client?.trim() && c.status?.trim())
                    .map((c) => c.id);

                  if (missingTypeIds.length > 0) {
                    try {
                      const res = await fetch(
                        "/api/Data/Applications/Taskflow/CustomerDatabase/BulkEditTypeClient",
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userIds: missingTypeIds, type_client: "TSA Client" }),
                        }
                      );
                      const json = await res.json();

                      if (json.success) {
                        toast.success(`Updated type_client for ${missingTypeIds.length} customers.`);
                        setCustomersAction((prev) =>
                          prev.map((c) =>
                            missingTypeIds.includes(c.id) ? { ...c, type_client: "TSA Client" } : c
                          )
                        );
                      } else {
                        toast.error(json.error || "Failed to update type_client.");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to update type_client.");
                    }
                  }
                }

                // Bulk update status if "Missing Status" is checked (existing logic)
                if (auditSelection.missingStatus) {
                  const missingStatusIds = audited
                    .filter((c) => !c.status?.trim() && c.type_client?.trim())
                    .map((c) => c.id);

                  if (missingStatusIds.length > 0) {
                    try {
                      const res = await fetch(
                        "/api/Data/Applications/Taskflow/CustomerDatabase/BulkEditStatus",
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userIds: missingStatusIds, status: "Active" }),
                        }
                      );
                      const json = await res.json();

                      if (json.success) {
                        toast.success(`Updated status for ${missingStatusIds.length} customers.`);
                        setCustomersAction((prev) =>
                          prev.map((c) =>
                            missingStatusIds.includes(c.id) ? { ...c, status: "Active" } : c
                          )
                        );
                      } else {
                        toast.error(json.error || "Failed to update statuses.");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to update statuses.");
                    }
                  }
                }
              }}
            >
              Take Action
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  );
};
