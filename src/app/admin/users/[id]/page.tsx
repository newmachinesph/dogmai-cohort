"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Calendar,
  Clock,
  Edit,
  UserCog,
  GraduationCap,
  FileText,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, getInitials, getRoleDisplayName } from "@/lib/utils";

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  cohort: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

interface StaffAssignment {
  id: string;
  role: string;
  cohort: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

interface Submission {
  id: string;
  status: string;
  score: number | null;
  submittedAt: string;
  assignment: {
    id: string;
    title: string;
    maxPoints: number;
  };
}

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  enrollments: Enrollment[];
  staffAssignments: StaffAssignment[];
  submissions?: Submission[];
  _count: {
    submissions: number;
    attendanceRecords: number;
    notifications: number;
  };
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${id}?include=submissions`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("User not found");
            router.push("/admin/users");
            return;
          }
          throw new Error("Failed to fetch user");
        }
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">User not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive";
      case "STAFF":
        return "default";
      case "STUDENT":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500">Active</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "DROPPED":
        return <Badge variant="destructive">Dropped</Badge>;
      case "ON_HOLD":
        return <Badge className="bg-amber-500">On Hold</Badge>;
      case "INSTRUCTOR":
        return <Badge className="bg-blue-500">Instructor</Badge>;
      case "TA":
        return <Badge variant="secondary">TA</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">User Profile</h1>
            <p className="text-muted-foreground">View and manage user details</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/users/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit User
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(user.displayName || user.username)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">
                  {user.displayName || user.username}
                </h2>
                <p className="text-muted-foreground">@{user.username}</p>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={getRoleVariant(user.role)}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                  {user.isActive ? (
                    <Badge className="bg-emerald-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>

                <div className="w-full mt-6 space-y-3 text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>

                  {user.lastLoginAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Last seen {formatRelativeTime(user.lastLoginAt)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Submissions</span>
                <span className="font-medium">{user._count.submissions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Attendance Records</span>
                <span className="font-medium">{user._count.attendanceRecords}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Notifications</span>
                <span className="font-medium">{user._count.notifications}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="enrollments">
            <TabsList>
              <TabsTrigger value="enrollments">
                <GraduationCap className="h-4 w-4 mr-2" />
                Enrollments ({user.enrollments?.length || 0})
              </TabsTrigger>
              {user.role !== "STUDENT" && (
                <TabsTrigger value="assignments">
                  <UserCog className="h-4 w-4 mr-2" />
                  Staff Assignments ({user.staffAssignments?.length || 0})
                </TabsTrigger>
              )}
              {user.role === "STUDENT" && user.submissions && (
                <TabsTrigger value="submissions">
                  <FileText className="h-4 w-4 mr-2" />
                  Submissions ({user.submissions?.length || 0})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="enrollments" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {user.enrollments?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cohort</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Enrolled</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.enrollments.map((enrollment) => (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">
                              {enrollment.cohort.name}
                            </TableCell>
                            <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(enrollment.enrolledAt)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/cohorts/${enrollment.cohort.id}`}>
                                  View Cohort
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No enrollments</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {user.role !== "STUDENT" && (
              <TabsContent value="assignments" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {user.staffAssignments?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cohort</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Cohort Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.staffAssignments.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell className="font-medium">
                                {assignment.cohort.name}
                              </TableCell>
                              <TableCell>{getStatusBadge(assignment.role)}</TableCell>
                              <TableCell>{getStatusBadge(assignment.cohort.status)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/admin/cohorts/${assignment.cohort.id}`}>
                                    View Cohort
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No staff assignments</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {user.role === "STUDENT" && user.submissions && (
              <TabsContent value="submissions" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {user.submissions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.submissions.map((submission) => (
                            <TableRow key={submission.id}>
                              <TableCell className="font-medium">
                                {submission.assignment.title}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatRelativeTime(submission.submittedAt)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    submission.status === "GRADED"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {submission.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {submission.score !== null ? (
                                  <span className="font-medium">
                                    {submission.score}/{submission.assignment.maxPoints}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No submissions yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
