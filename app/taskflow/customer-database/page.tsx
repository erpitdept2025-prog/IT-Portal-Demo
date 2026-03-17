"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Pagination } from "@/components/app-pagination";
import { Download } from "@/components/taskflow/customer-database/download";
import { Audit } from "@/components/taskflow/customer-database/audit";
import { Calendar } from "@/components/taskflow/customer-database/calendar";
import { ImportDialog } from "@/components/taskflow/customer-database/import";
import { AuditDialog } from "@/components/taskflow/customer-database/audit-dialog";
import { DeleteDialog } from "@/components/taskflow/customer-database/delete";
import { TransferDialog } from "@/components/taskflow/customer-database/transfer";
import { FilterDialog } from "@/components/taskflow/customer-database/filter";
import { toast } from "sonner";
import { Loader2, Filter } from "lucide-react";
import {
  BadgeCheck,
  AlertTriangle,
  Clock,
  XCircle,
  PauseCircle,
  UserX,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Audit logger ─────────────────────────────────────────────────────────────
import {
  logCustomerAudit,
  type AuditActor,
  type TransferDetail,
} from "@/lib/audit/customer-audit";
import type { TransferSuccessPayload } from "@/components/taskflow/customer-database/transfer";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditKey = "duplicates" | "missingType" | "missingStatus";

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

const AUDIT_PAGE = "Customer Database";

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // userId is injected by NavUser: router.push(`/...?userId=${user.id}`)
  const [userId] = useState<string | null>(searchParams?.get("userId") ?? null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // ── Current actor (who is making changes) ────────────────────────────────
  const [currentActor, setCurrentActor] = useState<AuditActor>({
    uid: null,
    name: null,
    email: null,
    role: null,
    referenceId: null,
  });

  // Ref keeps audit callbacks always reading the latest actor value without
  // needing to re-create those callbacks every time currentActor changes.
  const currentActorRef = useRef<AuditActor>(currentActor);
  useEffect(() => {
    currentActorRef.current = currentActor;
  }, [currentActor]);

  const [audited, setAudited] = useState<Customer[]>([]);
  const [isAuditView, setIsAuditView] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<Set<number>>(new Set());
  const [auditFilter, setAuditFilter] = useState<
    "" | "all" | "missingType" | "missingStatus" | "duplicates"
  >("");
  const [showFilters, setShowFilters] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [tsaList, setTsaList] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [filterTSA, setFilterTSA] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIdsAction] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [auditSelection, setAuditSelection] = useState<
    Record<AuditKey, boolean>
  >({ duplicates: false, missingType: false, missingStatus: false });

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [tsas, setTsas] = useState<{ label: string; value: string }[]>([]);
  const [tsms, setTsms] = useState<{ label: string; value: string }[]>([]);
  const [managers, setManagers] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferType, setTransferType] = useState<"TSM" | "Manager" | null>(
    null,
  );
  const [transferSelection, setTransferSelection] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Snapshot of selected customers taken BEFORE the transfer dialog opens
  const preTransferSnapshotRef = useRef<Customer[]>([]);

  const toggleAuditSelection = (key: AuditKey) => {
    setAuditSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Fetch logged-in user details via /api/user ────────────────────────────
  // userId is passed as a query param by NavUser when navigating to this page.
  // The /api/user endpoint looks up the MongoDB users collection by _id and
  // returns the full user document (minus password). We only need name + email
  // for the audit actor.
  // AFTER — reads from localStorage, no API call needed
  useEffect(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setCurrentActor({
        uid: parsed.uid ?? null,
        name: parsed.name ?? null,
        email: parsed.email ?? null,
        role: parsed.role ?? null,
        referenceId: parsed.referenceId ?? null,
      });
    } catch {
      console.warn("[CustomerAudit] Could not read user from localStorage.");
    }
  }, []); // no dependency needed — localStorage is synchronous and immediate

  useEffect(() => {
    const fetchTSA = async () => {
      try {
        const res = await fetch(
          "/api/UserManagement/FetchTSA?Role=Territory%20Sales%20Associate",
        );
        const json = await res.json();
        if (Array.isArray(json)) {
          const formatted = json.map((user: any) => ({
            value: user.ReferenceID,
            label: `${user.Firstname} ${user.Lastname}`,
          }));
          setTsaList([{ value: "all", label: "All TSA" }, ...formatted]);
        }
      } catch (err) {
        console.error("Error fetching TSA list:", err);
      }
    };
    fetchTSA();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      const toastId = toast.loading("Fetching customer data...");
      try {
        const response = await fetch(
          "/api/Data/Applications/Taskflow/CustomerDatabase/Fetch",
        );
        const json = await response.json();
        setCustomers(json.data || []);
        toast.success("Customer data loaded successfully!", { id: toastId });
      } catch (err) {
        console.error("Error fetching customers:", err);
        toast.error("Failed to load customer data.", { id: toastId });
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!showTransferDialog) return;
    const fetchDropdowns = async () => {
      try {
        const [tsaRes, tsmRes, managerRes] = await Promise.all([
          fetch("/api/UserManagement/FetchTSA?Role=Territory Sales Associate"),
          fetch("/api/UserManagement/FetchTSM?Role=Territory Sales Manager"),
          fetch("/api/UserManagement/FetchManager?Role=Manager"),
        ]);
        const tsaData = await tsaRes.json();
        const tsmData = await tsmRes.json();
        const managerData = await managerRes.json();
        setTsas(
          tsaData.map((m: any) => ({
            label: `${m.Firstname} ${m.Lastname}`,
            value: m.ReferenceID,
          })),
        );
        setTsms(
          tsmData.map((t: any) => ({
            label: `${t.Firstname} ${t.Lastname}`,
            value: t.ReferenceID,
          })),
        );
        setManagers(
          managerData.map((m: any) => ({
            label: `${m.Firstname} ${m.Lastname}`,
            value: m.ReferenceID,
          })),
        );
      } catch {
        toast.error("Failed to fetch manager/TSM lists.");
      }
    };
    fetchDropdowns();
  }, [showTransferDialog]);

  const typeOptions = useMemo(() => {
    const types = new Set(customers.map((c) => c.type_client).filter(Boolean));
    return ["all", ...Array.from(types)];
  }, [customers]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(customers.map((c) => c.status).filter(Boolean));
    return ["all", ...Array.from(statuses)];
  }, [customers]);

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setIsFiltering(false);
      toast.info("Filter updated.");
    }, 600);
    return () => clearTimeout(timer);
  }, [search, filterType, filterStatus]);

  useEffect(() => setPage(1), [search, filterType, filterStatus]);

  const filtered = useMemo(() => {
    return customers
      .filter((c) =>
        [
          c.company_name,
          c.contact_person,
          c.email_address,
          c.region,
          c.manager,
          c.tsm,
        ].some((field) => field?.toLowerCase().includes(search.toLowerCase())),
      )
      .filter((c) =>
        filterType === "all" ? true : c.type_client === filterType,
      )
      .filter((c) =>
        filterStatus === "all" ? true : c.status === filterStatus,
      )
      .filter((c) =>
        filterTSA === "all"
          ? true
          : c.referenceid?.trim().toLowerCase() ===
            filterTSA.trim().toLowerCase(),
      )
      .filter((c) => {
        if (!startDate && !endDate) return true;
        const created = new Date(c.date_created).getTime();
        const start = startDate ? new Date(startDate).getTime() : null;
        const end = endDate ? new Date(endDate).getTime() : null;
        if (start && created < start) return false;
        if (end && created > end) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date_created).getTime();
        const dateB = new Date(b.date_created).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [
    customers,
    search,
    filterType,
    filterStatus,
    filterTSA,
    startDate,
    endDate,
    sortOrder,
  ]);

  const displayData = useMemo(() => {
    if (!isAuditView) return filtered;
    if (auditFilter === "" || auditFilter === "all") return audited;
    if (auditFilter === "missingType")
      return audited.filter((c) => !c.type_client?.trim() && c.status?.trim());
    if (auditFilter === "missingStatus")
      return audited.filter((c) => !c.status?.trim() && c.type_client?.trim());
    if (auditFilter === "duplicates")
      return audited.filter((c) => duplicateIds.has(c.id));
    return audited;
  }, [filtered, audited, isAuditView, auditFilter, duplicateIds]);

  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPage));
  const current = displayData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );
  const totalCount = filtered.length;

  const handleReturn = () => {
    setIsAuditView(false);
    setAudited([]);
    setDuplicateIds(new Set());
  };

  const tsaMap = useMemo(() => {
    const map: Record<string, string> = {};
    tsaList.forEach((t) => {
      map[t.value.toLowerCase()] = t.label;
    });
    return map;
  }, [tsaList]);

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return toast.error("No customers selected.");
    setShowDeleteDialog(true);
  };

  // ─── Bulk Delete ──────────────────────────────────────────────────────────
  const executeBulkDelete = async (): Promise<void> => {
    if (selectedIds.size === 0) {
      toast.error("No customers selected.");
      return;
    }

    const idsArray = Array.from(selectedIds);
    const deletedCustomers = customers.filter((c) => selectedIds.has(c.id));
    let deletedCount = 0;
    let loadingToastId = toast.loading(`Deleting 0/${idsArray.length}...`);

    try {
      const res = await fetch(
        "/api/Data/Applications/Taskflow/CustomerDatabase/BulkDelete",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: idsArray }),
        },
      );
      const result = await res.json();

      if (result.success) {
        for (let i = 0; i < idsArray.length; i++) {
          deletedCount++;
          toast.dismiss(loadingToastId);
          loadingToastId = toast.loading(
            `Deleting ${deletedCount}/${idsArray.length}...`,
          );
          await new Promise((res) => setTimeout(res, 30));
        }
        toast.success(`Deleted ${deletedCount} customers.`);
        setCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setSelectedIdsAction(new Set());

        // ── Audit ──────────────────────────────────────────────────────
        await Promise.all(
          deletedCustomers.map((c) =>
            logCustomerAudit({
              action: "delete",
              affectedCount: deletedCustomers.length,
              customerId: String(c.id),
              customerName: c.company_name,
              actor: currentActorRef.current,
              context: {
                page: AUDIT_PAGE,
                source: "BulkDelete",
                bulk: deletedCustomers.length > 1,
              },
            }),
          ),
        );
      } else {
        toast.error(result.error || "Bulk delete failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bulk delete failed.");
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIdsAction(newSet);
    setSelectAll(newSet.size === current.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIdsAction(new Set());
      setSelectAll(false);
    } else {
      setSelectedIdsAction(new Set(current.map((c) => c.id)));
      setSelectAll(true);
    }
  };

  // ─── Auto-Generate Reference Numbers ─────────────────────────────────────
  const handleAutoGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error("No customers selected.");
      return;
    }
    setIsGenerating(true);
    try {
      const selectedCustomers = customers.filter((c) => selectedIds.has(c.id));
      const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      };
      const updates = selectedCustomers.map((customer, index) => {
        const initials = getInitials(customer.company_name);
        const regionCode = (customer.region || "NCR")
          .toUpperCase()
          .replace(/\s+/g, "");
        const seqNum = (index + 1).toString().padStart(10, "0");
        return {
          id: customer.id,
          account_reference_number: `${initials}-${regionCode}-${seqNum}`,
        };
      });

      const res = await fetch(
        "/api/Data/Applications/Taskflow/CustomerDatabase/UpdateReferenceNumber",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        },
      );
      const result = await res.json();

      if (result.success) {
        setCustomers((prev) =>
          prev.map((c) => {
            const u = updates.find((u) => u.id === c.id);
            return u
              ? { ...c, account_reference_number: u.account_reference_number }
              : c;
          }),
        );
        toast.success("Reference numbers generated and updated successfully.");

        // ── Audit ──────────────────────────────────────────────────────
        await Promise.all(
          selectedCustomers.map((c, i) =>
            logCustomerAudit({
              action: "autoid",
              affectedCount: selectedCustomers.length,
              customerId: String(c.id),
              customerName: c.company_name,
              changes: {
                account_reference_number: {
                  before: c.account_reference_number || null,
                  after: updates[i].account_reference_number,
                },
              },
              actor: currentActorRef.current,
              context: {
                page: AUDIT_PAGE,
                source: "AutoGenerateID",
                bulk: selectedCustomers.length > 1,
              },
            }),
          ),
        );
      } else {
        toast.error(result.error || "Failed to update reference numbers.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during update.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Transfer: snapshot BEFORE dialog opens ───────────────────────────────
  const handleOpenTransferDialog = () => {
    preTransferSnapshotRef.current = customers.filter((c) =>
      selectedIds.has(c.id),
    );
    setShowTransferDialog(true);
  };

  /**
   * Called by TransferDialog with ONE bundled payload after all API calls succeed.
   * Logs a single audit entry per customer covering TSA + TSM + Manager together.
   */
  const handleTransferSuccess = async (payload: TransferSuccessPayload) => {
    const snapshot = preTransferSnapshotRef.current;
    if (!snapshot.length) return;

    const transfer: TransferDetail = {
      tsa: payload.tsa
        ? {
            toId: payload.tsa.toId,
            toName: payload.tsa.toName,
            fromId: snapshot[0].referenceid || null,
            fromName:
              tsaMap[snapshot[0].referenceid?.trim().toLowerCase()] ||
              snapshot[0].referenceid ||
              null,
          }
        : null,
      tsm: payload.tsm
        ? { toName: payload.tsm.toName, fromName: snapshot[0].tsm || null }
        : null,
      manager: payload.manager
        ? {
            toName: payload.manager.toName,
            fromName: snapshot[0].manager || null,
          }
        : null,
    };

    await Promise.all(
      snapshot.map((c) =>
        logCustomerAudit({
          action: "transfer",
          affectedCount: snapshot.length,
          customerId: String(c.id),
          customerName: c.company_name,
          transfer,
          actor: currentActorRef.current,
          context: {
            page: AUDIT_PAGE,
            source: "TransferDialog",
            bulk: snapshot.length > 1,
          },
        }),
      ),
    );

    preTransferSnapshotRef.current = [];
  };

  // ─── Import audit callback ────────────────────────────────────────────────
  const handleImportSuccess = async (
    count: number,
    tsaId: string,
    tsaName: string,
  ) => {
    await logCustomerAudit({
      action: "create",
      affectedCount: count,
      customerName: `${count} customers imported`,
      transfer: null,
      changes: { assigned_tsa: { before: null, after: tsaName } },
      actor: currentActorRef.current,
      context: { page: AUDIT_PAGE, source: "ImportDialog", bulk: count > 1 },
    });
  };

  // ─── Edit Customer Dialog ─────────────────────────────────────────────────
  function EditCustomerDialog({
    open,
    onOpenChange,
    customer,
    onSave,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: Customer | null;
    onSave: (updated: Customer) => void;
  }) {
    const [form, setForm] = useState<Customer | null>(customer);
    useEffect(() => {
      setForm(customer);
    }, [customer]);
    if (!form) return null;

    const handleChange = (key: keyof Customer, value: string) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const handleSubmit = async () => {
      if (!form || !customer) return;
      try {
        const res = await fetch(
          "/api/Data/Applications/Taskflow/CustomerDatabase/Edit",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          },
        );
        const result = await res.json();
        if (!result.success) {
          toast.error(result.error || "Update failed");
          return;
        }

        onSave(form);
        toast.success("Customer updated successfully");
        onOpenChange(false);

        // ── Audit: diff only changed fields ────────────────────────────
        const TRACKED: (keyof Customer)[] = [
          "company_name",
          "contact_person",
          "contact_number",
          "email_address",
          "address",
          "region",
          "type_client",
          "status",
          "remarks",
        ];
        const changes: Record<string, { before: unknown; after: unknown }> = {};
        for (const key of TRACKED) {
          if (customer[key] !== form[key])
            changes[key] = {
              before: customer[key] ?? null,
              after: form[key] ?? null,
            };
        }
        if (Object.keys(changes).length > 0) {
          await logCustomerAudit({
            action: "update",
            affectedCount: 1,
            customerId: String(form.id),
            customerName: form.company_name,
            changes,
            actor: currentActorRef.current,
            context: {
              page: AUDIT_PAGE,
              source: "EditCustomerDialog",
              bulk: false,
            },
          });
        }
      } catch {
        toast.error("Something went wrong");
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Input
              placeholder="Company Name"
              value={form.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
            <Input
              placeholder="Contact Person"
              value={form.contact_person}
              onChange={(e) => handleChange("contact_person", e.target.value)}
            />
            <Input
              placeholder="Contact Number"
              value={form.contact_number}
              onChange={(e) => handleChange("contact_number", e.target.value)}
            />
            <Input
              placeholder="Email Address"
              value={form.email_address}
              onChange={(e) => handleChange("email_address", e.target.value)}
            />
            <Input
              placeholder="Type"
              value={form.type_client}
              onChange={(e) => handleChange("type_client", e.target.value)}
            />
            <Input
              placeholder="Status"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            />
            <Input
              placeholder="Region"
              value={form.region}
              onChange={(e) => handleChange("region", e.target.value)}
            />
            <Input
              placeholder="Remarks"
              value={form.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ProtectedPageWrapper>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              Home
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Taskflow</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Customer Database</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 px-4 py-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-full pr-8"
              />
              {isFiltering && (
                <Loader2 className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Filter />
              </Button>
              <Calendar
                startDate={startDate}
                endDate={endDate}
                setStartDateAction={setStartDate}
                setEndDateAction={setEndDate}
              />

              <ImportDialog onSuccessAction={handleImportSuccess} />

              <Download data={filtered} filename="CustomerDatabase" />
              {selectedIds.size > 0 && (
                <>
                  <Button variant="outline" onClick={handleOpenTransferDialog}>
                    <ArrowRight className="w-4 h-4" /> Transfer
                  </Button>
                  <Button onClick={handleAutoGenerate} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Auto-Generate ID"} (
                    {selectedIds.size})
                  </Button>
                  <Button onClick={handleBulkDelete} variant="destructive">
                    Delete Selected ({selectedIds.size})
                  </Button>
                </>
              )}

              {!isAuditView ? (
                <Audit
                  customers={customers}
                  setAuditedAction={setAudited}
                  setDuplicateIdsAction={setDuplicateIds}
                  setIsAuditViewAction={setIsAuditView}
                />
              ) : (
                <Button variant="outline" onClick={handleReturn}>
                  Return to List
                </Button>
              )}

              <TransferDialog
                open={showTransferDialog}
                onOpenChangeAction={(open) => {
                  setShowTransferDialog(open);
                  if (!open) {
                    setTransferSelection("");
                    setTransferType(null);
                  }
                }}
                selectedIds={new Set(Array.from(selectedIds).map(String))}
                setSelectedIdsAction={(ids: Set<string>) => {
                  setSelectedIdsAction(
                    new Set(Array.from(ids).map((id) => Number(id))),
                  );
                }}
                setAccountsAction={(updateFn) =>
                  setCustomers((prev) => updateFn(prev))
                }
                tsas={tsas}
                tsms={tsms}
                managers={managers}
                onSuccessAction={handleTransferSuccess}
              />
            </div>

            {showFilters && (
              <FilterDialog
                open={showFilters}
                onOpenChange={setShowFilters}
                filterTSA={filterTSA}
                setFilterTSA={setFilterTSA}
                filterType={filterType}
                setFilterType={setFilterType}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                tsaList={tsaList}
                typeOptions={typeOptions}
                statusOptions={statusOptions}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>

          {isAuditView && (
            <div className="mx-4 mb-2 mt-1 flex flex-col gap-2 bg-muted/50 rounded-md px-4 py-2 border border-border text-[13px]">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div
                  className="font-medium cursor-pointer select-none underline text-red-600"
                  onClick={() => {
                    setAuditSelection({
                      duplicates: true,
                      missingType: true,
                      missingStatus: true,
                    });
                    setShowAuditDialog(true);
                  }}
                >
                  🧾 Audit Summary:{" "}
                  <span className="font-semibold text-red-600">
                    {audited.length}
                  </span>{" "}
                  total issues found
                </div>
                <div className="flex flex-wrap gap-2 justify-end ml-auto">
                  <ButtonGroup
                    aria-label="Audit Filter Buttons"
                    className="flex"
                  >
                    <Button
                      size="sm"
                      variant={
                        auditFilter === "missingType" ? "secondary" : "outline"
                      }
                      className={`rounded-l-md ${auditFilter === "missingType" ? "bg-yellow-100 text-yellow-900" : ""}`}
                      onClick={() =>
                        setAuditFilter(
                          auditFilter === "missingType" ? "" : "missingType",
                        )
                      }
                    >
                      ⚠ Missing Type:{" "}
                      {
                        audited.filter(
                          (c) => !c.type_client?.trim() && c.status?.trim(),
                        ).length
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        auditFilter === "missingStatus"
                          ? "secondary"
                          : "outline"
                      }
                      className={
                        auditFilter === "missingStatus"
                          ? "bg-yellow-100 text-yellow-900"
                          : ""
                      }
                      onClick={() =>
                        setAuditFilter(
                          auditFilter === "missingStatus"
                            ? ""
                            : "missingStatus",
                        )
                      }
                    >
                      ⚠ Missing Status:{" "}
                      {
                        audited.filter(
                          (c) => !c.status?.trim() && c.type_client?.trim(),
                        ).length
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        auditFilter === "duplicates" ? "secondary" : "outline"
                      }
                      className={`rounded-r-md ${auditFilter === "duplicates" ? "bg-red-100 text-red-900" : ""}`}
                      onClick={() =>
                        setAuditFilter(
                          auditFilter === "duplicates" ? "" : "duplicates",
                        )
                      }
                    >
                      🔁 Duplicates: {Array.from(duplicateIds).length}
                    </Button>
                  </ButtonGroup>
                </div>
              </div>
            </div>
          )}

          <DeleteDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            selectedCount={selectedIds.size}
            onConfirm={executeBulkDelete}
          />

          <AuditDialog
            showAuditDialog={showAuditDialog}
            setShowAuditDialogAction={setShowAuditDialog}
            audited={audited}
            duplicateIds={duplicateIds}
            auditSelection={auditSelection}
            toggleAuditSelectionAction={toggleAuditSelection}
            setAuditFilterAction={setAuditFilter}
            setCustomersAction={setCustomers}
          />

          <div className="p-4">
            <div className="flex justify-start mb-2">
              <Badge variant="outline">{`Total: ${totalCount}`}</Badge>
            </div>
            <div className="overflow-auto min-h-[200px] flex items-center justify-center">
              {isFetching ? (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="size-6 animate-spin" />
                  <span>Loading customers...</span>
                </div>
              ) : current.length > 0 ? (
                <Table className="whitespace-nowrap text-[13px] min-w-full">
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>TSA</TableHead>
                      <TableHead>TSM</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead>Date Updated</TableHead>
                      <TableHead>Next Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[12px]">
                    {current.map((c) => {
                      const isMissingType = !c.type_client?.trim();
                      const isMissingStatus = !c.status?.trim();
                      const isDuplicate = duplicateIds.has(c.id);
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(c.id)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCustomer(c);
                                setShowEditDialog(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell className="uppercase whitespace-normal break-words max-w-[250px]">
                            <span
                              className={
                                isDuplicate || isMissingType || isMissingStatus
                                  ? "line-through underline decoration-red-500 decoration-2"
                                  : ""
                              }
                            >
                              {c.company_name}
                              <br />
                              {c.account_reference_number}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize whitespace-normal break-words max-w-[200px]">
                            {c.contact_person}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words max-w-[250px]">
                            {c.email_address}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                isMissingType
                                  ? "line-through underline decoration-red-500 decoration-2"
                                  : ""
                              }
                            >
                              {c.type_client || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {c.status ? (
                              (() => {
                                const s = c.status.trim().toLowerCase();
                                if (s === "active")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-500/90 hover:bg-green-600 text-white flex items-center gap-1"
                                    >
                                      <BadgeCheck className="size-3.5" />
                                      Active
                                    </Badge>
                                  );
                                if (s === "new client")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-500/90 hover:bg-blue-600 text-white flex items-center gap-1"
                                    >
                                      <UserCheck className="size-3.5" />
                                      New Client
                                    </Badge>
                                  );
                                if (s === "non-buying")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-yellow-500/90 hover:bg-yellow-600 text-white flex items-center gap-1"
                                    >
                                      <AlertTriangle className="size-3.5" />
                                      Non-Buying
                                    </Badge>
                                  );
                                if (s === "inactive")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-red-500/90 hover:bg-red-600 text-white flex items-center gap-1"
                                    >
                                      <XCircle className="size-3.5" />
                                      Inactive
                                    </Badge>
                                  );
                                if (s === "on hold")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-stone-500/90 hover:bg-stone-600 text-white flex items-center gap-1"
                                    >
                                      <PauseCircle className="size-3.5" />
                                      On Hold
                                    </Badge>
                                  );
                                if (s === "used")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1"
                                    >
                                      <Clock className="size-3.5" />
                                      Used
                                    </Badge>
                                  );
                                if (s === "for deletion" || s === "remove")
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                                    >
                                      <UserX className="size-3.5" />
                                      {c.status}
                                    </Badge>
                                  );
                                return (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground"
                                  >
                                    {c.status}
                                  </Badge>
                                );
                              })()
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground"
                              >
                                —
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{c.region}</TableCell>
                          <TableCell className="capitalize">
                            {tsaMap[c.referenceid?.trim().toLowerCase()] ||
                              c.referenceid ||
                              "-"}
                          </TableCell>
                          <TableCell>{c.tsm}</TableCell>
                          <TableCell>{c.manager}</TableCell>
                          <TableCell>
                            {new Date(c.date_created).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(c.date_updated).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {c.next_available_date
                              ? new Date(
                                  c.next_available_date,
                                ).toLocaleDateString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No customers found.
                </div>
              )}
            </div>
          </div>

          <EditCustomerDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            customer={editingCustomer}
            onSave={(updated) =>
              setCustomers((prev) =>
                prev.map((c) => (c.id === updated.id ? updated : c)),
              )
            }
          />

          <div className="flex justify-center items-center gap-4 my-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChangeAction={setPage}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  );
}
