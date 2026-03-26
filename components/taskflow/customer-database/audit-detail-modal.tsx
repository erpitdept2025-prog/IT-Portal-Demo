"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditIssue {
  id: number;
  company_name?: string;
  contact_person?: string;
  contact_number?: string;
  contact_email?: string;
  address?: string;
  type_client?: string;
  status?: string;
  referenceid?: string;
}

interface DuplicateDetail {
  type: "within" | "across";
  matchedWith: number[];
}

interface AuditDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  issue: AuditIssue | null;
  duplicateDetail?: DuplicateDetail;
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
}

export function AuditDetailModal({
  open,
  onOpenChange,
  issue,
  duplicateDetail,
  onApprove,
  onReject,
  loading = false,
}: AuditDetailModalProps) {
  const [showAction, setShowAction] = useState(false);

  if (!issue) return null;

  const isDuplicate = duplicateDetail !== undefined;
  const isMissingFields =
    !issue.type_client?.trim() || !issue.status?.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base">Audit Issue Details</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  {issue.company_name || "Unknown Company"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-4 pr-4">
            {/* Issue Type Badge */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                ISSUE TYPE
              </h3>
              <div className="flex flex-wrap gap-2">
                {isDuplicate && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "bg-red-50 text-red-700 border-red-200",
                      duplicateDetail?.type === "within"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : ""
                    )}
                  >
                    {duplicateDetail?.type === "within"
                      ? "⚠️ Duplicate within TSA"
                      : "🔴 Duplicate across TSAs"}
                  </Badge>
                )}
                {isMissingFields && (
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200"
                  >
                    📋 Missing Required Fields
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Company Information */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                COMPANY INFORMATION
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="text-sm font-medium">{issue.company_name || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Person</p>
                    <p className="text-sm font-medium">
                      {issue.contact_person || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Number</p>
                    <p className="text-sm font-medium">
                      {issue.contact_number || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-sm font-medium">
                    {issue.contact_email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{issue.address || "—"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fields Status */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                REQUIRED FIELDS
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded border border-border hover:bg-muted/50">
                  <span className="text-sm">Type of Client</span>
                  {issue.type_client?.trim() ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {issue.type_client}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      Missing
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-2.5 rounded border border-border hover:bg-muted/50">
                  <span className="text-sm">Status</span>
                  {issue.status?.trim() ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {issue.status}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      Missing
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Duplicate Info */}
            {isDuplicate && duplicateDetail?.matchedWith && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                    DUPLICATE INFORMATION
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {duplicateDetail.type === "within"
                      ? "Duplicate found within same TSA"
                      : "Duplicate found in different TSA"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {duplicateDetail.matchedWith.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs">
                        ID: {id}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Meta Information */}
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                REFERENCE
              </h3>
              <p className="text-xs text-muted-foreground">
                TSA ID: {issue.referenceid || "—"}
              </p>
            </div>
          </div>
        </ScrollArea>

        <Separator className="mt-4" />
        <div className="flex gap-2 justify-end pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Rejecting...
              </>
            ) : (
              "Reject"
            )}
          </Button>
          <Button
            onClick={onApprove}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Approving...
              </>
            ) : (
              "Approve"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
