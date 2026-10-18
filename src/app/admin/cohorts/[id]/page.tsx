"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserCog,
  BookOpen,
  ClipboardList,
  MoreVertical,
  Pencil,
  Loader2,
  Clock,
} from "lucide-react";
import { formatDate, getInitials, getRoleDisplayName, getStatusDisplayName, calculatePercentage } from "@/lib/utils";
import { toast } from "sonner";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

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
}

interface Enrollment {
  id: string;
  userId: string;
  status: string;
  enrolledAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
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

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  isPublished: boolean;
  _count: {
    submissions: number;
  };
}

interface CohortModule {
  id: string;
  isLocked: boolean;
  module: {
    id: string;
    title: string;
    _count: {
      lessons: number;
    };
  };
}

export default function CohortDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;

  // Use SWR for all data fetching with caching
  const { data: cohortData, error: cohortError, isLoading: cohortLoading, mutate: mutateCohort } = useSWR<{ cohort: Cohort }>(
    `/api/cohorts/${cohortId}`,
    fetcher,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const { data: enrollmentsData } = useSWR<{ enrollments: Enrollment[] }>(
    `/api/enrollments?cohortId=${cohortId}&limit=100`,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const { data: staffData } = useSWR<{ assignments: StaffAssignment[] }>(
    `/api/staff-assignments?cohortId=${cohortId}`,
    fetcher,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const { data: assignmentsData } = useSWR<{ assignments: Assignment[] }>(
    `/api/assignments?cohortId=${cohortId}&limit=100`,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const { data: modulesData } = useSWR<{ cohortModules: CohortModule[] }>(
    `/api/cohort-modules?cohortId=${cohortId}`,
    fetcher,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const cohort = cohortData?.cohort || null;
  const enrollments = enrollmentsData?.enrollments || [];
  const staffAssignments = staffData?.assignments || [];
  const assignments = assignmentsData?.assignments || [];
  const cohortModules = modulesData?.cohortModules || [];
  const loading = cohortLoading;
  const error = cohortError?.message || null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/cohorts/${cohortId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      mutateCohort();
      toast.success(`Status updated to ${getStatusDisplayName(newStatus)}`);
    } catch (err) {
      console.error("Error updating status:", err);
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

  const getCohortProgress = () => {
    if (!cohort) return 0;
    const start = new Date(cohort.startDate).getTime();
    const end = new Date(cohort.endDate).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    return calculatePercentage(now - start, end - start);
  };

  // Only show loading spinner if no cached data
  if (loading && !cohort) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">{error || "Cohort not found"}</p>
        <Button onClick={() => router.push("/admin/cohorts")}>Back to Cohorts</Button>
      </div>
    );
  }

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.push("/admin/cohorts")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cohorts
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{cohort.name}</h1>
              <Badge variant={getStatusVariant(cohort.status)}>
                {getStatusDisplayName(cohort.status)}
              </Badge>
            </div>
            {cohort.description && (
              <p className="text-muted-foreground mt-1">{cohort.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {cohort.status !== "UPCOMING" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("UPCOMING")}>
                    Set as Upcoming
                  </DropdownMenuItem>
                )}
                {cohort.status !== "ACTIVE" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                    Set as Active
                  </DropdownMenuItem>
                )}
                {cohort.status !== "COMPLETED" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("COMPLETED")}>
                    Mark as Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {cohort.status !== "ARCHIVED" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("ARCHIVED")}>
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href={`/admin/cohorts/${cohortId}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Cohort
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{cohort.location}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="font-semibold">
                  {activeEnrollments.length}
                  <span className="text-muted-foreground font-normal">/{cohort.maxStudents}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <UserCog className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff</p>
                <p className="font-semibold">{staffAssignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modules</p>
                <p className="font-semibold">{cohortModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <ClipboardList className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="font-semibold">{assignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Course Progress</span>
                  <span className="font-medium">{getCohortProgress()}%</span>
                </div>
                <Progress value={getCohortProgress()} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(cohort.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(cohort.endDate)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohort.schedule ? (
              <div className="space-y-2">
                {(() => {
                  try {
                    const schedule = JSON.parse(cohort.schedule);
                    return (
                      <div className="space-y-2">
                        {schedule.days && (
                          <div>
                            <p className="text-sm text-muted-foreground">Days</p>
                            <p className="font-medium">{schedule.days.join(", ")}</p>
                          </div>
                        )}
                        {schedule.time && (
                          <div>
                            <p className="text-sm text-muted-foreground">Time</p>
                            <p className="font-medium">{schedule.time}</p>
                          </div>
                        )}
                      </div>
                    );
                  } catch {
                    return <p className="text-muted-foreground">{cohort.schedule}</p>;
                  }
                })()}
              </div>
            ) : (
              <p className="text-muted-foreground">No schedule set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Students, Staff, Assignments */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">
            Students ({activeEnrollments.length})
          </TabsTrigger>
          <TabsTrigger value="staff">
            Staff ({staffAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="modules">
            Modules ({cohortModules.length})
          </TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({assignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Enrolled Students</CardTitle>
              <Button asChild size="sm">
                <Link href={`/admin/cohorts/${cohortId}/students`}>
                  Manage Students
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students enrolled yet</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href={`/admin/cohorts/${cohortId}/students`}>
                      Add Students
                    </Link>
                  </Button>
                </div>
              ) : (
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
                    {enrollments.slice(0, 10).map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {enrollment.user.avatarUrl && (
                                <AvatarImage src={enrollment.user.avatarUrl} />
                              )}
                              <AvatarFallback className="text-xs">
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
                          <Badge variant={enrollment.status === "ACTIVE" ? "default" : "secondary"}>
                            {enrollment.status}
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
                              <DropdownMenuItem className="text-destructive">
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
              {enrollments.length > 10 && (
                <div className="mt-4 text-center">
                  <Button asChild variant="outline">
                    <Link href={`/admin/cohorts/${cohortId}/students`}>
                      View all {enrollments.length} students
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Staff Assignments</CardTitle>
              <Button asChild size="sm">
                <Link href={`/admin/cohorts/${cohortId}/staff`}>
                  Manage Staff
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {staffAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No staff assigned yet</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href={`/admin/cohorts/${cohortId}/staff`}>
                      Assign Staff
                    </Link>
                  </Button>
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
                    {staffAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {assignment.user.avatarUrl && (
                                <AvatarImage src={assignment.user.avatarUrl} />
                              )}
                              <AvatarFallback className="text-xs">
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
                          <Badge variant="outline">
                            {getRoleDisplayName(assignment.role)}
                          </Badge>
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
                              <DropdownMenuItem className="text-destructive">
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
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Modules</CardTitle>
              <Button asChild size="sm">
                <Link href={`/admin/cohorts/${cohortId}/modules`}>
                  Manage Modules
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {cohortModules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No modules assigned yet</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href={`/admin/cohorts/${cohortId}/modules`}>
                      Assign Modules
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Lessons</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortModules.slice(0, 10).map((cm) => (
                      <TableRow key={cm.id}>
                        <TableCell className="font-medium">
                          {cm.module.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cm.module._count.lessons} lessons
                        </TableCell>
                        <TableCell>
                          <Badge variant={cm.isLocked ? "secondary" : "default"}>
                            {cm.isLocked ? "Locked" : "Unlocked"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {cohortModules.length > 10 && (
                <div className="mt-4 text-center">
                  <Button asChild variant="outline">
                    <Link href={`/admin/cohorts/${cohortId}/modules`}>
                      View all {cohortModules.length} modules
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assignments</CardTitle>
              <Button asChild size="sm">
                <Link href={`/admin/cohorts/${cohortId}/assignments/new`}>
                  Create Assignment
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assignments created yet</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href={`/admin/cohorts/${cohortId}/assignments/new`}>
                      Create First Assignment
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(assignment.dueDate)}
                        </TableCell>
                        <TableCell>
                          {assignment._count.submissions}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isPublished ? "default" : "secondary"}>
                            {assignment.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View Submissions</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Delete
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
