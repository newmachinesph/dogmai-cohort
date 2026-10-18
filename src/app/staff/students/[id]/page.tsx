"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils";

interface Submission {
  id: string;
  status: string;
  score: number | null;
  submittedAt: string;
  assignment: {
    id: string;
    title: string;
    maxPoints: number;
    passingScore: number;
    dueDate: string;
  };
}

interface Attendance {
  id: string;
  status: string;
  checkInAt: string | null;
  session: {
    id: string;
    title: string;
    date: string;
  };
}

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  cohort: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

interface Student {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  enrollments: Enrollment[];
  submissions: Submission[];
  attendance: Attendance[];
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/users/${id}?include=enrollments,submissions,attendance`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Student not found");
            router.push("/staff/students");
            return;
          }
          throw new Error("Failed to fetch student");
        }
        const data = await res.json();
        setStudent(data.user);
      } catch (error) {
        console.error("Error fetching student:", error);
        toast.error("Failed to load student details");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Student not found</p>
        <Button asChild className="mt-4">
          <Link href="/staff/students">Back to Students</Link>
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalSubmissions = student.submissions?.length || 0;
  const gradedSubmissions = student.submissions?.filter((s) => s.status === "GRADED") || [];
  const passedSubmissions = gradedSubmissions.filter(
    (s) => s.score !== null && s.score >= s.assignment.passingScore
  );
  const avgScore =
    gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length
      : 0;

  const totalAttendance = student.attendance?.length || 0;
  const presentCount = student.attendance?.filter((a) => a.status === "PRESENT").length || 0;
  const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="secondary">Submitted</Badge>;
      case "GRADED":
        return <Badge className="bg-emerald-500">Graded</Badge>;
      case "LATE":
        return <Badge variant="destructive">Late</Badge>;
      case "PRESENT":
        return <Badge className="bg-emerald-500">Present</Badge>;
      case "ABSENT":
        return <Badge variant="destructive">Absent</Badge>;
      case "LATE_ARRIVAL":
        return <Badge className="bg-amber-500">Late</Badge>;
      case "EXCUSED":
        return <Badge variant="outline">Excused</Badge>;
      case "ACTIVE":
        return <Badge className="bg-emerald-500">Active</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "DROPPED":
        return <Badge variant="destructive">Dropped</Badge>;
      case "ON_HOLD":
        return <Badge className="bg-amber-500">On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff/students">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Student Profile</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/messages?userId=${student.id}`}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  {student.avatarUrl && <AvatarImage src={student.avatarUrl} />}
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(student.displayName || student.username)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">
                  {student.displayName || student.username}
                </h2>
                <p className="text-muted-foreground">@{student.username}</p>

                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{student.email}</span>
                </div>

                {student.lastLoginAt && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last seen {formatRelativeTime(student.lastLoginAt)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(student.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {student.enrollments?.length > 0 ? (
                student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-3 bg-muted/50 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{enrollment.cohort.name}</span>
                      {getStatusBadge(enrollment.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(enrollment.cohort.startDate)} -{" "}
                      {formatDate(enrollment.cohort.endDate)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enrolled {formatRelativeTime(enrollment.enrolledAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No enrollments</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalSubmissions}</p>
                    <p className="text-xs text-muted-foreground">Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {passedSubmissions.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {avgScore.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {attendanceRate.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="submissions">
            <TabsList>
              <TabsTrigger value="submissions">
                Submissions ({totalSubmissions})
              </TabsTrigger>
              <TabsTrigger value="attendance">
                Attendance ({totalAttendance})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submissions" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {student.submissions?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {student.submissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell className="font-medium">
                              {submission.assignment.title}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatRelativeTime(submission.submittedAt)}
                            </TableCell>
                            <TableCell>{getStatusBadge(submission.status)}</TableCell>
                            <TableCell>
                              {submission.score !== null ? (
                                <span
                                  className={
                                    submission.score >= submission.assignment.passingScore
                                      ? "text-emerald-600 font-medium"
                                      : "text-destructive font-medium"
                                  }
                                >
                                  {submission.score}/{submission.assignment.maxPoints}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/staff/grading/${submission.id}`}>
                                  {submission.status === "GRADED" ? "Review" : "Grade"}
                                </Link>
                              </Button>
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

            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {student.attendance?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Session</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {student.attendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.session.title}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(record.session.date)}
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {record.checkInAt
                                ? new Date(record.checkInAt).toLocaleTimeString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No attendance records yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
