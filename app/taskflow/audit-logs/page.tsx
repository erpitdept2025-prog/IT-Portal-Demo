"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  limit,
} from "firebase/firestore";

import {
  ArrowRight,
  Search,
  Activity,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Hash,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Eye,
  DatabaseBackup,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * All possible actions that can be performed on a customer record.
 */
type CustomerAuditAction =
  | "transfer" // TSA/TSM/Manager reassignment
  | "create" // New customer created or imported
  | "update" // Field-level edit
  | "delete" // Single or bulk delete
  | "autoid"; // Auto-generate reference number

interface AuditActor {
  uid?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  referenceId?: string | null;
}

interface TransferDetail {
  tsa?: {
    fromId?: string | null;
    fromName?: string | null;
    toId?: string | null;
    toName?: string | null;
  } | null;
  tsm?: { fromName?: string | null; toName?: string | null } | null;
  manager?: { fromName?: string | null; toName?: string | null } | null;
}

interface CustomerAuditLog {
  id: string;
  action: CustomerAuditAction;
  /** How many records were affected (bulk ops) */
  affectedCount?: number;
  /** Primary customer record touched */
  customerId?: string | null;
  customerName?: string | null;
  /** For transfer actions */
  transfer?: TransferDetail | null;
  /** Generic before/after snapshot for update actions */
  changes?: Record<string, { before: unknown; after: unknown }> | null;
  actor?: AuditActor | null;
  timestamp?: Timestamp | null;
  /** Page / source context */
  context?: {
    page?: string;
    source?: string;
    bulk?: boolean;
  } | null;
}

const PAGE_SIZE = 15;

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  CustomerAuditAction,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  transfer: {
    label: "Transferred",
    icon: <ArrowRight className="h-3 w-3" />,
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800",
  },
  create: {
    label: "Created",
    icon: <Plus className="h-3 w-3" />,
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  update: {
    label: "Updated",
    icon: <Pencil className="h-3 w-3" />,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800",
  },
  delete: {
    label: "Deleted",
    icon: <Trash2 className="h-3 w-3" />,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800",
  },
  autoid: {
    label: "Auto-ID",
    icon: <Hash className="h-3 w-3" />,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(ts.toDate());
}

function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  const diff = Date.now() - ts.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(str: string | null | undefined): string {
  if (!str) return "from-slate-400 to-slate-600";
  const palette = [
    "from-blue-400 to-blue-600",
    "from-violet-400 to-violet-600",
    "from-emerald-400 to-emerald-600",
    "from-amber-400 to-amber-600",
    "from-rose-400 to-rose-600",
    "from-cyan-400 to-cyan-600",
    "from-fuchsia-400 to-fuchsia-600",
    "from-teal-400 to-teal-600",
  ];
  const hash = str.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Table-row inline pill: shows TSA → name as primary.
 * Extra fields (TSM / Manager) shown as a compact secondary line.
 */
function TransferPill({ transfer }: { transfer: TransferDetail }) {
  const tsa = transfer.tsa;
  const extras: string[] = [];
  if (transfer.tsm?.toName) extras.push(`TSM → ${transfer.tsm.toName}`);
  if (transfer.manager?.toName) extras.push(`Mgr → ${transfer.manager.toName}`);

  if (tsa) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-1.5 py-0.5"
          >
            TSA
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {tsa.fromName || tsa.fromId || "—"}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold">
            {tsa.toName || tsa.toId || "—"}
          </span>
        </div>
        {extras.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {extras.join(" · ")}
          </p>
        )}
      </div>
    );
  }

  // No TSA — show whatever fields are present
  return (
    <div className="space-y-0.5">
      {transfer.tsm?.toName && (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-1.5 py-0.5"
          >
            TSM
          </Badge>
          <span className="text-xs text-muted-foreground">
            {transfer.tsm.fromName || "—"}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold">{transfer.tsm.toName}</span>
        </div>
      )}
      {transfer.manager?.toName && (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-1.5 py-0.5"
          >
            Mgr
          </Badge>
          <span className="text-xs text-muted-foreground">
            {transfer.manager.fromName || "—"}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold">
            {transfer.manager.toName}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerAuditLogsPage() {
  const [logs, setLogs] = useState<CustomerAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<CustomerAuditLog | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    transfers: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
    autoids: 0,
  });

  // ── Live Firestore subscription ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "taskflow_customer_audit_logs"),
      orderBy("timestamp", "desc"),
      limit(500),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: CustomerAuditLog[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CustomerAuditLog, "id">),
      }));
      setLogs(items);

      const s = {
        total: items.length,
        transfers: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        autoids: 0,
      };
      items.forEach((l) => {
        if (l.action === "transfer") s.transfers++;
        else if (l.action === "create") s.creates++;
        else if (l.action === "update") s.updates++;
        else if (l.action === "delete") s.deletes++;
        else if (l.action === "autoid") s.autoids++;
      });
      setStats(s);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Date filter helper ────────────────────────────────────────────────────
  const isWithinDateRange = useCallback(
    (ts: Timestamp | null | undefined) => {
      if (filterDate === "all" || !ts) return true;
      const date = ts.toDate();
      const now = new Date();
      if (filterDate === "today")
        return date.toDateString() === now.toDateString();
      if (filterDate === "week")
        return date >= new Date(now.getTime() - 7 * 86400000);
      if (filterDate === "month")
        return date >= new Date(now.getTime() - 30 * 86400000);
      return true;
    },
    [filterDate],
  );

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = logs.filter((log) => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (!isWithinDateRange(log.timestamp)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.customerName?.toLowerCase().includes(q) ||
        log.customerId?.toLowerCase().includes(q) ||
        log.actor?.name?.toLowerCase().includes(q) ||
        log.actor?.email?.toLowerCase().includes(q) ||
        log.actor?.role?.toLowerCase().includes(q) ||
        log.transfer?.tsa?.fromName?.toLowerCase().includes(q) ||
        log.transfer?.tsa?.toName?.toLowerCase().includes(q) ||
        log.transfer?.tsm?.fromName?.toLowerCase().includes(q) ||
        log.transfer?.tsm?.toName?.toLowerCase().includes(q) ||
        log.transfer?.manager?.fromName?.toLowerCase().includes(q) ||
        log.transfer?.manager?.toName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => setCurrentPage(1), [search, filterAction, filterDate]);

  const clearFilters = () => {
    setSearch("");
    setFilterAction("all");
    setFilterDate("all");
  };

  const hasFilters = !!search || filterAction !== "all" || filterDate !== "all";

  const router = useRouter();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedPageWrapper>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            {/* Header */}
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
                    <BreadcrumbLink href="#">Customer Database</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Audit Logs</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <main className="p-6 md:p-10 space-y-6">
              {/* Page heading */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Customer Database — Audit Logs
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Real-time activity trail —{" "}
                    {loading ? (
                      "Loading..."
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">
                          {filtered.length}
                        </span>{" "}
                        events
                      </>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  {
                    label: "Total Events",
                    value: stats.total,
                    icon: <Activity className="h-4 w-4" />,
                    color: "text-foreground",
                    bg: "bg-muted/50 border",
                  },
                  {
                    label: "Transferred",
                    value: stats.transfers,
                    icon: <ArrowRight className="h-4 w-4" />,
                    color: ACTION_CONFIG.transfer.color,
                    bg: ACTION_CONFIG.transfer.bg,
                  },
                  {
                    label: "Created",
                    value: stats.creates,
                    icon: <Plus className="h-4 w-4" />,
                    color: ACTION_CONFIG.create.color,
                    bg: ACTION_CONFIG.create.bg,
                  },
                  {
                    label: "Updated",
                    value: stats.updates,
                    icon: <Pencil className="h-4 w-4" />,
                    color: ACTION_CONFIG.update.color,
                    bg: ACTION_CONFIG.update.bg,
                  },
                  {
                    label: "Deleted",
                    value: stats.deletes,
                    icon: <Trash2 className="h-4 w-4" />,
                    color: ACTION_CONFIG.delete.color,
                    bg: ACTION_CONFIG.delete.bg,
                  },
                  {
                    label: "Auto-ID",
                    value: stats.autoids,
                    icon: <Hash className="h-4 w-4" />,
                    color: ACTION_CONFIG.autoid.color,
                    bg: ACTION_CONFIG.autoid.bg,
                  },
                ].map((stat) => (
                  <Card key={stat.label} className={cn("border", stat.bg)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-medium", stat.color)}>
                          {stat.label}
                        </span>
                        <span className={cn(stat.color)}>{stat.icon}</span>
                      </div>
                      <p
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          stat.color,
                        )}
                      >
                        {loading ? "—" : stat.value.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filter bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9 h-9 text-sm"
                        placeholder="Search by customer, user, TSA name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <Select
                      value={filterAction}
                      onValueChange={setFilterAction}
                    >
                      <SelectTrigger className="h-9 w-[150px] text-xs">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="transfer">Transferred</SelectItem>
                        <SelectItem value="create">Created</SelectItem>
                        <SelectItem value="update">Updated</SelectItem>
                        <SelectItem value="delete">Deleted</SelectItem>
                        <SelectItem value="autoid">Auto-ID</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger className="h-9 w-[140px] text-xs">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-2 text-xs text-muted-foreground"
                        onClick={clearFilters}
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear filters
                      </Button>
                    )}

                    <span className="ml-auto text-xs text-muted-foreground">
                      {loading ? "Loading..." : `${filtered.length} events`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">
                            Modified By
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">
                            Action
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Transfer Detail
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">
                            Executed At
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]">
                            Detail
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {loading ? (
                          Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              {Array.from({ length: 6 }).map((_, j) => (
                                <td key={j} className="px-4 py-3">
                                  <div className="h-4 bg-muted rounded w-full" />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : paginated.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-16">
                              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                <DatabaseBackup className="h-10 w-10 opacity-20" />
                                <p className="text-sm font-medium">
                                  No audit logs found
                                </p>
                                {hasFilters && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="text-xs"
                                  >
                                    Clear filters
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginated.map((log) => {
                            const action =
                              ACTION_CONFIG[log.action] ?? ACTION_CONFIG.update;
                            const isBulk =
                              log.context?.bulk || (log.affectedCount ?? 0) > 1;

                            return (
                              <tr
                                key={log.id}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                {/* Modified By */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={cn(
                                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold",
                                        avatarColor(
                                          log.actor?.name || log.actor?.email,
                                        ),
                                      )}
                                    >
                                      {getInitials(
                                        log.actor?.name || log.actor?.email,
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold truncate leading-tight">
                                        {log.actor?.name || "Unknown"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                        {log.actor?.email || "—"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate leading-tight capitalize">
                                        {log.actor?.role || "—"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "gap-1 text-[11px] font-semibold border w-fit",
                                        action.bg,
                                        action.color,
                                      )}
                                    >
                                      {action.icon}
                                      {action.label}
                                    </Badge>
                                    {isBulk && (
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        Bulk · {log.affectedCount ?? "?"}{" "}
                                        records
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Customer */}
                                <td className="px-4 py-3">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate max-w-[180px] uppercase">
                                      {log.customerName || "—"}
                                    </p>
                                    {log.customerId && (
                                      <p className="text-[10px] text-muted-foreground font-mono">
                                        #{log.customerId.slice(-8)}
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Transfer Detail */}
                                <td className="px-4 py-3">
                                  {log.action === "transfer" && log.transfer ? (
                                    <TransferPill transfer={log.transfer} />
                                  ) : log.action === "update" && log.changes ? (
                                    <p className="text-[10px] text-muted-foreground">
                                      {Object.keys(log.changes).join(", ")}{" "}
                                      changed
                                    </p>
                                  ) : log.action === "autoid" ? (
                                    <p className="text-[10px] text-muted-foreground">
                                      Reference number generated
                                    </p>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Timestamp */}
                                <td className="px-4 py-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-default">
                                        <p className="text-xs font-medium">
                                          {timeAgo(log.timestamp)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {formatTimestamp(log.timestamp)}
                                        </p>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        {formatTimestamp(log.timestamp)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>

                                {/* View detail */}
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setSelectedLog(log)}
                                  >
                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {!loading && filtered.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        Showing{" "}
                        <span className="font-medium text-foreground">
                          {(currentPage - 1) * PAGE_SIZE + 1}–
                          {Math.min(currentPage * PAGE_SIZE, filtered.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-foreground">
                          {filtered.length}
                        </span>{" "}
                        events
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let page: number;
                            if (totalPages <= 5) page = i + 1;
                            else if (currentPage <= 3) page = i + 1;
                            else if (currentPage >= totalPages - 2)
                              page = totalPages - 4 + i;
                            else page = currentPage - 2 + i;
                            return (
                              <Button
                                key={page}
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="icon"
                                className="h-7 w-7 text-xs"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          },
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </main>
          </SidebarInset>
        </SidebarProvider>

        {/* ── Detail Dialog ────────────────────────────────────────────────── */}
        {selectedLog && (
          <Dialog
            open={!!selectedLog}
            onOpenChange={() => setSelectedLog(null)}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <DatabaseBackup className="h-4 w-4 text-primary" />
                  Customer Audit Log — Detail
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Action badge */}
                {(() => {
                  const cfg =
                    ACTION_CONFIG[selectedLog.action] ?? ACTION_CONFIG.update;
                  return (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-xs font-semibold border",
                        cfg.bg,
                        cfg.color,
                      )}
                    >
                      {cfg.icon}
                      {cfg.label}
                      {selectedLog.context?.bulk && (
                        <span className="ml-1 opacity-70">
                          · Bulk ({selectedLog.affectedCount ?? "?"} records)
                        </span>
                      )}
                    </Badge>
                  );
                })()}

                {/* Modified by */}
                <div className="p-3 rounded-lg bg-muted/40 border space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Modified By
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                        avatarColor(
                          selectedLog.actor?.name || selectedLog.actor?.email,
                        ),
                      )}
                    >
                      {getInitials(
                        selectedLog.actor?.name || selectedLog.actor?.email,
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedLog.actor?.name || "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedLog.actor?.email || "No email"}
                      </p>
                      {selectedLog.actor?.role && (
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {selectedLog.actor.role}
                          {selectedLog.actor.referenceId &&
                            ` · ${selectedLog.actor.referenceId}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer */}
                <div className="p-3 rounded-lg bg-muted/40 border space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground">
                        Company Name
                      </p>
                      <p className="font-medium uppercase">
                        {selectedLog.customerName || "—"}
                      </p>
                    </div>
                    {selectedLog.customerId && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Customer ID
                        </p>
                        <p className="font-mono text-xs">
                          {selectedLog.customerId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transfer detail */}
                {selectedLog.action === "transfer" && selectedLog.transfer && (
                  <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Transfer Detail
                    </p>
                    <div className="space-y-3">
                      {/* TSA row */}
                      {selectedLog.transfer.tsa && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                            TSA
                          </p>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <div className="p-2 rounded-md bg-background border text-center">
                              <p className="text-[10px] text-muted-foreground mb-0.5">
                                From
                              </p>
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold mx-auto mb-1",
                                  avatarColor(
                                    selectedLog.transfer.tsa.fromName,
                                  ),
                                )}
                              >
                                {getInitials(selectedLog.transfer.tsa.fromName)}
                              </div>
                              <p className="text-xs font-semibold leading-tight">
                                {selectedLog.transfer.tsa.fromName || "—"}
                              </p>
                              {selectedLog.transfer.tsa.fromId && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {selectedLog.transfer.tsa.fromId}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="p-2 rounded-md bg-background border text-center">
                              <p className="text-[10px] text-muted-foreground mb-0.5">
                                To
                              </p>
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold mx-auto mb-1",
                                  avatarColor(selectedLog.transfer.tsa.toName),
                                )}
                              >
                                {getInitials(selectedLog.transfer.tsa.toName)}
                              </div>
                              <p className="text-xs font-semibold leading-tight">
                                {selectedLog.transfer.tsa.toName || "—"}
                              </p>
                              {selectedLog.transfer.tsa.toId && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {selectedLog.transfer.tsa.toId}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* TSM row */}
                      {selectedLog.transfer.tsm && (
                        <div className="grid grid-cols-[60px_1fr_auto_1fr] items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold px-1.5 py-0.5 w-fit"
                          >
                            TSM
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {selectedLog.transfer.tsm.fromName || "—"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-semibold truncate">
                            {selectedLog.transfer.tsm.toName || "—"}
                          </span>
                        </div>
                      )}
                      {/* Manager row */}
                      {selectedLog.transfer.manager && (
                        <div className="grid grid-cols-[60px_1fr_auto_1fr] items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold px-1.5 py-0.5 w-fit"
                          >
                            Manager
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {selectedLog.transfer.manager.fromName || "—"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-semibold truncate">
                            {selectedLog.transfer.manager.toName || "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Field changes for update actions */}
                {selectedLog.action === "update" &&
                  selectedLog.changes &&
                  Object.keys(selectedLog.changes).length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Changes
                      </p>
                      <div className="space-y-2">
                        {Object.entries(selectedLog.changes).map(
                          ([field, { before, after }]) => (
                            <div
                              key={field}
                              className="grid grid-cols-[120px_1fr_1fr] gap-2 items-start text-xs"
                            >
                              <span className="font-medium text-muted-foreground capitalize">
                                {field.replace(/_/g, " ")}
                              </span>
                              <span className="line-through text-muted-foreground truncate">
                                {String(before ?? "—")}
                              </span>
                              <span className="font-semibold truncate text-foreground">
                                {String(after ?? "—")}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Execution timestamp */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Executed at</span>
                  <span className="font-semibold text-foreground">
                    {formatTimestamp(selectedLog.timestamp)}
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </TooltipProvider>
    </ProtectedPageWrapper>
  );
}
