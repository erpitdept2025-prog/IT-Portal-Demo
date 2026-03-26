"use client";

import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpDown,
  Eye,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditIssue {
  id: number;
  company_name?: string;
  contact_person?: string;
  contact_number?: string;
  type_client?: string;
  status?: string;
  referenceid?: string;
}

interface DuplicateDetail {
  type: "within" | "across";
  matchedWith: number[];
}

interface AuditTableProps {
  data: AuditIssue[];
  duplicateDetails?: Map<number, DuplicateDetail>;
  onRowClick: (issue: AuditIssue) => void;
  loading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function AuditTable({
  data,
  duplicateDetails = new Map(),
  onRowClick,
  loading = false,
}: AuditTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const lowerSearch = search.toLowerCase();
    return data.filter(
      (item) =>
        item.company_name?.toLowerCase().includes(lowerSearch) ||
        item.contact_person?.toLowerCase().includes(lowerSearch) ||
        item.contact_number?.includes(search) ||
        item.referenceid?.includes(search)
    );
  }, [data, search]);

  // Columns definition
  const columns: ColumnDef<AuditIssue>[] = [
    {
      accessorKey: "company_name",
      header: ({ column }) => (
        <button
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="flex items-center gap-1 hover:text-foreground"
        >
          Company Name
          <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.original.company_name || "—"}</div>
      ),
    },
    {
      accessorKey: "contact_person",
      header: ({ column }) => (
        <button
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="flex items-center gap-1 hover:text-foreground"
        >
          Contact Person
          <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.contact_person || "—"}</div>
      ),
    },
    {
      accessorKey: "contact_number",
      header: "Contact Number",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.contact_number || "—"}</div>
      ),
    },
    {
      id: "issues",
      header: "Issues",
      cell: ({ row }) => {
        const issue = row.original;
        const duplicate = duplicateDetails.get(issue.id);
        const hasMissingFields =
          !issue.type_client?.trim() || !issue.status?.trim();

        const badges = [];

        if (duplicate) {
          badges.push(
            <Badge
              key="duplicate"
              variant="outline"
              className={cn(
                "text-[10px]",
                duplicate.type === "within"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
              )}
            >
              {duplicate.type === "within" ? "⚠️ Within TSA" : "🔴 Cross TSA"}
            </Badge>
          );
        }

        if (hasMissingFields) {
          badges.push(
            <Badge
              key="missing"
              variant="outline"
              className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
            >
              📋 Missing Fields
            </Badge>
          );
        }

        return (
          <div className="flex gap-1.5 flex-wrap">
            {badges.length > 0 ? badges : <span className="text-xs text-muted-foreground">—</span>}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRowClick(row.original)}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  // Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: ITEMS_PER_PAGE,
      },
    },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalItems = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, contact, or reference..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              table.setPageIndex(0);
            }}
            className="pl-9 h-9"
            disabled={loading}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3",
                      header.id === "issues" && "w-32"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No audit issues found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {table.getRowModel().rows.length > 0
              ? pageIndex * ITEMS_PER_PAGE + 1
              : 0}
          </span>
          —
          <span className="font-semibold text-foreground">
            {Math.min((pageIndex + 1) * ITEMS_PER_PAGE, totalItems)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalItems}</span> results
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || loading}
            className="h-8 px-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: pageCount }).map((_, i) => (
              <Button
                key={i}
                variant={pageIndex === i ? "default" : "outline"}
                size="sm"
                onClick={() => table.setPageIndex(i)}
                disabled={loading}
                className="h-8 w-8"
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || loading}
            className="h-8 px-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
