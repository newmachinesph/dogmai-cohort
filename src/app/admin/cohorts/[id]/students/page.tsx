"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  UserPlus,
  MoreVertical,
  Users,
  Loader2,
} from "lucide-react";
import { formatDate, getInitials, getStatusDisplayName } from "@/lib/utils";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { toast } from "sonner";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Cohort {
  id: string;
  name: string;
  maxStudents: number;
}

interface Enrollment {
  id: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface AvailableUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export default function CohortStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;

  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [processing, setProcessing] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
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

  // Build enrollment URL for SWR
  const buildEnrollmentsUrl = () => {
    const params = new URLSearchParams();
    params.set("cohortId", cohortId);
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/enrollments?${params}`;
  };

  // Use SWR for caching
  const { data: cohortData } = useSWR<{ cohort: Cohort }>(
    `/api/cohorts/${cohortId}`,
    fetcher,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const { data: enrollmentsData, isLoading: loading, mutate } = useSWR<{
    enrollments: Enrollment[];
    pagination: { total: number; totalPages: number };
  }>(buildEnrollmentsUrl(), fetcher, {
    dedupingInterval: 30000,
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

  const cohort = cohortData?.cohort || null;
  const enrollments = enrollmentsData?.enrollments || [];

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
  };

  const fetchAvailableUsers = async (search: string) => {
    try {
      const res = await fetch(`/api/users?role=STUDENT&search=${encodeURIComponent(search)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already enrolled users
        const enrolledUserIds = enrollments.map((e) => e.userId);
        const available = data.users.filter((u: AvailableUser) => !enrolledUserIds.includes(u.id));
        setAvailableUsers(available);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (addDialogOpen && userSearchQuery.length >= 2) {
      const timer = setTimeout(() => {
        fetchAvailableUsers(userSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearchQuery, addDialogOpen, enrollments]);

  const handleAddStudent = async () => {
    if (!selectedUser) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          cohortId,
          status: "ACTIVE",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enroll student");
      }

      toast.success("Student enrolled successfully");
      setAddDialogOpen(false);
      setSelectedUser(null);
      setUserSearchQuery("");
      mutate();
    } catch (error) {
      console.error("Error enrolling student:", error);
      toast.error(error instanceof Error ? error.message : "Failed to enroll student");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!selectedEnrollment) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/enrollments/${selectedEnrollment.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove student");
      }

      toast.success("Student removed from cohort");
      setRemoveDialogOpen(false);
      setSelectedEnrollment(null);
      mutate();
    } catch (error) {
      console.error("Error removing student:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove student");
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async (enrollment: Enrollment, newStatus: string) => {
    try {
      const res = await fetch(`/api/enrollments/${enrollment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Status updated to ${getStatusDisplayName(newStatus)}`);
      mutate();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const activeCount = pagination.total;

  // Only show loading spinner if no cached data
  if (loading && enrollments.length === 0 && !cohort) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.push(`/admin/cohorts/${cohortId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cohort
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage Students</h1>
            <p className="text-muted-foreground mt-1">
              {cohort?.name} - {activeCount}/{cohort?.maxStudents} students
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No students match your search" : "No students enrolled yet"}</p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  Add First Student
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {enrollment.user.avatarUrl && (
                              <AvatarImage src={enrollment.user.avatarUrl} />
                            )}
                            <AvatarFallback className="text-sm">
                              {getInitials(enrollment.user.displayName || enrollment.user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {enrollment.user.displayName || enrollment.user.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            enrollment.status === "ACTIVE"
                              ? "default"
                              : enrollment.status === "COMPLETED"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {getStatusDisplayName(enrollment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(enrollment.enrolledAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/${enrollment.user.id}`}>
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {enrollment.status !== "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(enrollment, "ACTIVE")}
                              >
                                Set Active
                              </DropdownMenuItem>
                            )}
                            {enrollment.status !== "ON_HOLD" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(enrollment, "ON_HOLD")}
                              >
                                Put on Hold
                              </DropdownMenuItem>
                            )}
                            {enrollment.status !== "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(enrollment, "COMPLETED")}
                              >
                                Mark Completed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedEnrollment(enrollment);
                                setRemoveDialogOpen(true);
                              }}
                            >
                              Remove from Cohort
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.total > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Search for a student to enroll in this cohort
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
            {userSearchQuery.length >= 2 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No students found
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? "bg-primary/10 border border-primary"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <Avatar className="h-8 w-8">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                        <AvatarFallback className="text-xs">
                          {getInitials(user.displayName || user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedUser(null);
                setUserSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={!selectedUser || processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {selectedEnrollment?.user.displayName || selectedEnrollment?.user.username}
              </strong>{" "}
              from this cohort? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveStudent}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
