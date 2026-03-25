"use client";

import React, { useEffect, useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
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
import { Loader2, Search, Download, Eye } from "lucide-react";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuditSession {
  id: string;
  auditDate: any;
  userId: string;
  userName: string;
  userEmail: string;
  userReferenceId: string;
  auditType: string;
  totalIssues: number;
  duplicateCount: number;
  missingTypeCount: number;
  missingStatusCount: number;
  issues: any[];
  duplicateDetails: Record<string, any>;
  context: {
    page: string;
    source?: string;
    bulk?: boolean;
  };
  timestamp: any;
}

const AuditHistoryPage = () => {
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<AuditSession | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAuditHistory = async () => {
      try {
        setIsLoading(true);
        const auditQuery = query(
          collection(db, "audit_sessions"),
          orderBy("timestamp", "desc"),
          limit(100)
        );

        const snapshot = await getDocs(auditQuery);
        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditSession[];

        setAuditSessions(sessions);
      } catch (error) {
        console.error("[AuditHistory] Failed to fetch audit sessions:", error);
        toast.error("Failed to load audit history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditHistory();
  }, []);

  const filteredSessions = auditSessions.filter((session) =>
    searchTerm === ""
      ? true
      : session.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = (session: AuditSession) => {
    try {
      const dataStr = JSON.stringify(session, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-${session.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Audit exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export audit");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return "N/A";
    }
  };

  return (
    <ProtectedPageWrapper>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 bg-background">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:flex">
                  <BreadcrumbLink href="/taskflow">Taskflow</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:flex" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Audit History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Audit History</h1>
              <p className="text-muted-foreground">
                Review all past database audits and their results
              </p>
            </div>

            {/* Search Section */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table Section */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading audit history...</p>
                </div>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No audit history found</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">Audit Date</TableHead>
                      <TableHead className="font-bold">User Name</TableHead>
                      <TableHead className="font-bold">User Email</TableHead>
                      <TableHead className="font-bold text-center">Total Issues</TableHead>
                      <TableHead className="font-bold text-center">Duplicates</TableHead>
                      <TableHead className="font-bold text-center">Missing Fields</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm">
                          {formatDate(session.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">{session.userName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session.userEmail}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {session.totalIssues}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {session.duplicateCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {session.missingTypeCount + session.missingStatusCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSession(session);
                              setIsDetailDialogOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport(session)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Detail Dialog */}
            {selectedSession && (
              <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Audit Session Details</DialogTitle>
                    <DialogDescription>
                      Complete record of audit performed on {formatDate(selectedSession.timestamp)}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* User Info */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h3 className="font-semibold mb-3">User Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-mono">{selectedSession.userName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-mono">{selectedSession.userEmail}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">User ID</p>
                          <p className="font-mono text-xs">{selectedSession.userId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reference ID</p>
                          <p className="font-mono text-xs">{selectedSession.userReferenceId}</p>
                        </div>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h3 className="font-semibold mb-3">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-2xl font-bold text-red-700">
                            {selectedSession.totalIssues}
                          </p>
                          <p className="text-xs text-red-600">Total Issues</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-2xl font-bold text-orange-700">
                            {selectedSession.duplicateCount}
                          </p>
                          <p className="text-xs text-orange-600">Duplicates</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-2xl font-bold text-yellow-700">
                            {selectedSession.missingTypeCount}
                          </p>
                          <p className="text-xs text-yellow-600">Missing Type</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-2xl font-bold text-yellow-700">
                            {selectedSession.missingStatusCount}
                          </p>
                          <p className="text-xs text-yellow-600">Missing Status</p>
                        </div>
                      </div>
                    </div>

                    {/* Affected Records */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h3 className="font-semibold mb-3">Affected Records</h3>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {selectedSession.issues.length > 0 ? (
                          selectedSession.issues.map((issue: any) => (
                            <div
                              key={issue.id}
                              className="p-3 bg-background border rounded text-sm hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-mono font-semibold text-cyan-700">ID: {issue.id}</p>
                                  <p className="text-foreground">{issue.company_name}</p>
                                  <p className="text-muted-foreground text-xs mt-1">
                                    TSA: {issue.referenceid}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No affected records</p>
                        )}
                      </div>
                    </div>

                    {/* Context */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h3 className="font-semibold mb-2">Audit Context</h3>
                      <p className="text-sm text-muted-foreground">
                        Page: <span className="font-mono">{selectedSession.context.page}</span>
                      </p>
                      {selectedSession.context.source && (
                        <p className="text-sm text-muted-foreground">
                          Source:{" "}
                          <span className="font-mono">{selectedSession.context.source}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedPageWrapper>
  );
};

export default AuditHistoryPage;
