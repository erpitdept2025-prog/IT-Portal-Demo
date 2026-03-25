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
import { ChevronDown, AlertCircle, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
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
  userId?: string;
  userName?: string;
  userEmail?: string;
  userReferenceId?: string;
}

interface CollapsibleCardProps {
  title: string;
  badge: { count: number; color: string; bgColor: string };
  isChecked: boolean;
  onCheckChange: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  badge,
  isChecked,
  onCheckChange,
  icon,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card hover:border-border/80 transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">{icon}</div>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onCheckChange}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer w-4 h-4"
          />
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className={cn("text-xs font-bold px-3 py-1 rounded-full", badge.color, badge.bgColor)}>
            {badge.count}
          </span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform flex-shrink-0 text-muted-foreground", {
            "rotate-180": isExpanded,
          })}
        />
      </button>

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto border-t border-border p-4 bg-muted/30 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className={cn("rounded-lg p-4 text-center", color)}>
    <div className="text-2xl font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground font-medium">{label}</div>
  </div>
);

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
  userId,
  userName,
  userEmail,
  userReferenceId,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const missingTypeCount = audited.filter((c) => !c.type_client?.trim() && c.status?.trim()).length;
  const missingStatusCount = audited.filter((c) => !c.status?.trim() && c.type_client?.trim()).length;
  const totalIssues = audited.length;

  const handleCopyUserId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      toast.success("User ID copied to clipboard");
    }
  };

  return (
    (audited.length > 0 || duplicateIds.size > 0) && (
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialogAction}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Audit Summary Report</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Review detected issues and select actions to resolve them
            </DialogDescription>

            {/* User Info Section */}
            {userId && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Audited by:</span>
                    <span className="font-mono font-semibold text-foreground">{userName || "Unknown"}</span>
                  </div>
                  {userEmail && (
                    <div className="flex items-center justify-between">
                      <span>Email:</span>
                      <span className="font-mono text-foreground">{userEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>User ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground">{userId}</span>
                      <button
                        onClick={handleCopyUserId}
                        className="p-1 hover:bg-background rounded transition-colors"
                        title="Copy User ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <StatCard label="Total Issues" value={totalIssues} color="bg-red-50" />
            <StatCard label="Duplicates" value={duplicateIds.size} color="bg-orange-50" />
            <StatCard label="Missing Fields" value={missingTypeCount + missingStatusCount} color="bg-yellow-50" />
          </div>

          {/* Issues Sections */}
          <div className="flex flex-col gap-4 mt-6">
            {duplicateIds.size > 0 && (
              <CollapsibleCard
                title="Duplicate Records"
                badge={{
                  count: duplicateIds.size,
                  color: "text-white",
                  bgColor: "bg-red-600",
                }}
                isChecked={auditSelection.duplicates}
                onCheckChange={() => toggleAuditSelectionAction("duplicates")}
                icon={<AlertCircle className="h-5 w-5 text-red-600" />}
              >
                <div className="space-y-3">
                  {Array.from(duplicateIds).map((id) => {
                    const customer = audited.find((c) => c.id === id);
                    const detail = duplicateDetails?.get(id);
                    return (
                      <div
                        key={id}
                        className="border border-border rounded p-3 bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-bold text-cyan-700">ID: {id}</span>
                              {detail && (
                                <span
                                  className={cn(
                                    "text-xs font-semibold px-2 py-1 rounded",
                                    detail.type === "within"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-red-100 text-red-700"
                                  )}
                                >
                                  {detail.type === "within" ? "Within TSA" : "Across TSAs"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{customer?.company_name}</p>
                            {detail && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Matches IDs: {detail.matchedWith.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleCard>
            )}

            {missingTypeCount > 0 && (
              <CollapsibleCard
                title="Missing Type/Client"
                badge={{
                  count: missingTypeCount,
                  color: "text-white",
                  bgColor: "bg-yellow-600",
                }}
                isChecked={auditSelection.missingType}
                onCheckChange={() => toggleAuditSelectionAction("missingType")}
                icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
              >
                <div className="space-y-2">
                  {audited
                    .filter((c) => !c.type_client?.trim() && c.status?.trim())
                    .map((customer) => (
                      <div
                        key={customer.id}
                        className="border border-border rounded p-3 bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-cyan-700">ID: {customer.id}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{customer.company_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Status: {customer.status}</p>
                      </div>
                    ))}
                </div>
              </CollapsibleCard>
            )}

            {missingStatusCount > 0 && (
              <CollapsibleCard
                title="Missing Status"
                badge={{
                  count: missingStatusCount,
                  color: "text-white",
                  bgColor: "bg-yellow-600",
                }}
                isChecked={auditSelection.missingStatus}
                onCheckChange={() => toggleAuditSelectionAction("missingStatus")}
                icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
              >
                <div className="space-y-2">
                  {audited
                    .filter((c) => !c.status?.trim() && c.type_client?.trim())
                    .map((customer) => (
                      <div
                        key={customer.id}
                        className="border border-border rounded p-3 bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-cyan-700">ID: {customer.id}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{customer.company_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Type: {customer.type_client}</p>
                      </div>
                    ))}
                </div>
              </CollapsibleCard>
            )}
          </div>

          <DialogFooter className="flex justify-between gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowAuditDialogAction(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                setIsLoading(true);
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
                      const url = new URL(
                        "/api/Data/Applications/Taskflow/CustomerDatabase/BulkEditTypeClient",
                        window.location.origin
                      );
                      if (userId) url.searchParams.append("userId", userId);

                      const res = await fetch(url, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userIds: missingTypeIds, type_client: "TSA Client" }),
                      });
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

                // Bulk update status if "Missing Status" is checked
                if (auditSelection.missingStatus) {
                  const missingStatusIds = audited
                    .filter((c) => !c.status?.trim() && c.type_client?.trim())
                    .map((c) => c.id);

                  if (missingStatusIds.length > 0) {
                    try {
                      const url = new URL(
                        "/api/Data/Applications/Taskflow/CustomerDatabase/BulkEditStatus",
                        window.location.origin
                      );
                      if (userId) url.searchParams.append("userId", userId);

                      const res = await fetch(url, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userIds: missingStatusIds, status: "Active" }),
                      });
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

                setIsLoading(false);
              }}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Take Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  );
};
