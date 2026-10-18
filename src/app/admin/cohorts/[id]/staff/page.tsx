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
  UserCog,
  Loader2,
} from "lucide-react";
import { formatDate, getInitials, getRoleDisplayName } from "@/lib/utils";
import { toast } from "sonner";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Cohort {
  id: string;
  name: string;
}

interface StaffAssignment {
  id: string;
  userId: string;
  role: string;
  assignedAt: string;
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
  role: string;
}

export default function CohortStaffPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;

  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [selectedRole, setSelectedRole] = useState("INSTRUCTOR");
  const [processing, setProcessing] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StaffAssignment | null>(null);

  const staffRoles = [
    { value: "INSTRUCTOR", label: "Instructor" },
    { value: "TEACHING_ASSISTANT", label: "Teaching Assistant" },
    { value: "MENTOR", label: "Mentor" },
  ];

  // Use SWR for caching
  const { data: cohortData } = useSWR<{ cohort: Cohort }>(
    `/api/cohorts/${cohortId}`,
    fetcher,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const { data: staffData, isLoading: loading, mutate } = useSWR<{ assignments: StaffAssignment[] }>(
    `/api/staff-assignments?cohortId=${cohortId}`,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const cohort = cohortData?.cohort || null;
  const staffAssignments = staffData?.assignments || [];

  const fetchAvailableUsers = async (search: string) => {
    try {
      // Fetch staff and admin users
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already assigned staff and students
        const assignedUserIds = staffAssignments.map((s) => s.userId);
        const available = data.users.filter(
          (u: AvailableUser) => !assignedUserIds.includes(u.id) && u.role !== "STUDENT"
        );
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
  }, [userSearchQuery, addDialogOpen, staffAssignments]);

  const handleAddStaff = async () => {
    if (!selectedUser) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/staff-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          cohortId,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign staff");
      }

      toast.success("Staff assigned successfully");
      setAddDialogOpen(false);
      setSelectedUser(null);
      setUserSearchQuery("");
      setSelectedRole("INSTRUCTOR");
      mutate();
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign staff");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveStaff = async () => {
    if (!selectedAssignment) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/staff-assignments/${selectedAssignment.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove staff");
      }

      toast.success("Staff removed from cohort");
      setRemoveDialogOpen(false);
      setSelectedAssignment(null);
      mutate();
    } catch (error) {
      console.error("Error removing staff:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove staff");
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async (assignment: StaffAssignment, newRole: string) => {
    try {
      const res = await fetch(`/api/staff-assignments/${assignment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to update role");
      toast.success(`Role updated to ${getRoleDisplayName(newRole)}`);
      mutate();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const filteredAssignments = staffAssignments.filter((s) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      s.user.email.toLowerCase().includes(search) ||
      s.user.username.toLowerCase().includes(search) ||
      (s.user.displayName?.toLowerCase().includes(search) ?? false)
    );
  });

  // Only show loading spinner if no cached data
  if (loading && staffAssignments.length === 0 && !cohort) {
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
            <h1 className="text-3xl font-bold">Manage Staff</h1>
            <p className="text-muted-foreground mt-1">
              {cohort?.name} - {staffAssignments.length} staff members
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Staff
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Staff ({filteredAssignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No staff match your search" : "No staff assigned yet"}</p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  Assign First Staff
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {assignment.user.avatarUrl && (
                            <AvatarImage src={assignment.user.avatarUrl} />
                          )}
                          <AvatarFallback className="text-sm">
                            {getInitials(assignment.user.displayName || assignment.user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {assignment.user.displayName || assignment.user.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleDisplayName(assignment.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(assignment.assignedAt)}
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
                            <Link href={`/admin/users/${assignment.user.id}`}>
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {staffRoles
                            .filter((r) => r.value !== assignment.role)
                            .map((role) => (
                              <DropdownMenuItem
                                key={role.value}
                                onClick={() => handleRoleChange(assignment, role.value)}
                              >
                                Change to {role.label}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedAssignment(assignment);
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
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff</DialogTitle>
            <DialogDescription>
              Search for a staff member to assign to this cohort
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />

            {userSearchQuery.length >= 2 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff members found
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
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedUser && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">Cohort Role</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {staffRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
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
            <Button onClick={handleAddStaff} disabled={!selectedUser || processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Staff Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Staff</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {selectedAssignment?.user.displayName || selectedAssignment?.user.username}
              </strong>{" "}
              from this cohort?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveStaff}
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
