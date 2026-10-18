"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, getStatusDisplayName } from "@/lib/utils";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { Plus, MoreVertical, FolderKanban, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Cohort {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  status: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  schedule: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    enrollments: number;
    staffAssignments: number;
    assignments: number;
  };
}

export default function CohortsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter]);

  // Build URL for SWR
  const buildUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());
    return `/api/cohorts?${params}`;
  };

  // Use SWR for caching
  const { data, isLoading: loading, mutate } = useSWR<{
    cohorts: Cohort[];
    pagination: { total: number; totalPages: number };
  }>(buildUrl(), fetcher, {
    dedupingInterval: 30000, // Cache for 30 seconds
    revalidateOnFocus: false,
    onSuccess: (data) => {
      if (data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    },
  });

  const cohorts = data?.cohorts || [];

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
  };

  const handleArchive = async (cohort: Cohort) => {
    try {
      const res = await fetch(`/api/cohorts/${cohort.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED", isArchived: true }),
      });

      if (!res.ok) throw new Error("Failed to archive cohort");
      toast.success("Cohort archived successfully");
      mutate();
    } catch (error) {
      console.error("Error archiving cohort:", error);
      toast.error("Failed to archive cohort");
    }
  };

  const handleDelete = async () => {
    if (!selectedCohort) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/cohorts/${selectedCohort.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete cohort");
      }

      toast.success("Cohort deleted successfully");
      setDeleteDialogOpen(false);
      mutate();
    } catch (error) {
      console.error("Error deleting cohort:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete cohort");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (cohort: Cohort, newStatus: string) => {
    try {
      const res = await fetch(`/api/cohorts/${cohort.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Cohort status updated to ${getStatusDisplayName(newStatus)}`);
      mutate();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "UPCOMING":
        return "secondary";
      case "COMPLETED":
        return "outline";
      case "ARCHIVED":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Only show loading spinner if no cached data
  if (loading && cohorts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cohorts</h1>
          <p className="text-muted-foreground mt-1">Manage your bootcamp cohorts</p>
        </div>
        <Button asChild>
          <Link href="/admin/cohorts/new">
            <Plus className="w-4 h-4 mr-2" />
            New Cohort
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cohorts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All" : getStatusDisplayName(status)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohorts Table */}
      <Card>
        {cohorts.length === 0 ? (
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No cohorts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first cohort to get started"}
              </p>
              {searchQuery || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/admin/cohorts/new">Create Cohort</Link>
                </Button>
              )}
            </div>
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => (
                  <TableRow key={cohort.id}>
                    <TableCell>
                      <Link
                        href={`/admin/cohorts/${cohort.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {cohort.name}
                      </Link>
                      {cohort.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {cohort.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{cohort.location}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(cohort.status)}>
                        {getStatusDisplayName(cohort.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(cohort.startDate)}</p>
                        <p className="text-muted-foreground">to {formatDate(cohort.endDate)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{cohort._count.enrollments}</span>
                      <span className="text-muted-foreground">/{cohort.maxStudents}</span>
                    </TableCell>
                    <TableCell>{cohort._count.staffAssignments}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/cohorts/${cohort.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/cohorts/${cohort.id}/students`}>Manage Students</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/cohorts/${cohort.id}/staff`}>Manage Staff</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/cohorts/${cohort.id}/edit`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {cohort.status !== "ACTIVE" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(cohort, "ACTIVE")}>
                              Set Active
                            </DropdownMenuItem>
                          )}
                          {cohort.status !== "COMPLETED" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(cohort, "COMPLETED")}>
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          {cohort.status !== "ARCHIVED" && (
                            <DropdownMenuItem onClick={() => handleArchive(cohort)}>
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedCohort(cohort);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.total > 0 && (
              <div className="p-4 border-t">
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cohort</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCohort?.name}&quot;? This action cannot be undone.
              {selectedCohort && selectedCohort._count.enrollments > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This cohort has {selectedCohort._count.enrollments} enrolled students.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
