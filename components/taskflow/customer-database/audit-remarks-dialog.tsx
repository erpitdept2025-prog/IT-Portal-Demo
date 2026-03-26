"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface AuditRemarksDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (status: string, remarks: string) => Promise<void>;
  action: "approve" | "reject" | null;
}

export function AuditRemarksDialog({
  open,
  onOpenChange,
  onConfirm,
  action,
}: AuditRemarksDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("resolved");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRemarks("");
      setStatus("resolved");
      setError(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!remarks.trim()) {
      setError(true);
      return;
    }
    setLoading(true);
    try {
      await onConfirm(status, remarks.trim());
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isApproving = action === "approve";
  const isRejecting = action === "reject";
  const icon = isApproving ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
  ) : isRejecting ? (
    <XCircle className="w-4 h-4 text-rose-600" />
  ) : (
    <AlertCircle className="w-4 h-4 text-amber-600" />
  );

  const bgColor = isApproving
    ? "bg-emerald-50 border-emerald-200"
    : isRejecting
      ? "bg-rose-50 border-rose-200"
      : "bg-amber-50 border-amber-200";

  const title = isApproving
    ? "Approve Audit Issue"
    : isRejecting
      ? "Reject Audit Issue"
      : "Update Audit Issue";

  const description = isApproving
    ? "Approve this audit issue resolution"
    : isRejecting
      ? "Reject this audit issue"
      : "Update the audit issue status";

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${bgColor}`}
            >
              {icon}
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Selection - only show for approvals */}
          {isApproving && (
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks <span className="text-rose-600">*</span>
            </Label>
            <Textarea
              id="remarks"
              placeholder="Add your remarks here..."
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (error && e.target.value.trim()) setError(false);
              }}
              className="min-h-[120px] text-sm resize-none"
              disabled={loading}
            />
            {error && (
              <p className="text-xs text-rose-600 font-medium">
                Remarks are required
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={
              isApproving
                ? "bg-emerald-600 hover:bg-emerald-700"
                : isRejecting
                  ? "bg-rose-600 hover:bg-rose-700"
                  : ""
            }
          >
            {loading && (
              <span className="inline-flex animate-spin mr-2">⏳</span>
            )}
            {isApproving ? "Approve" : isRejecting ? "Reject" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
