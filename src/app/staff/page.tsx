"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { getInitials, formatDate, formatRelativeTime } from "@/lib/utils";
import {
  FolderKanban,
  ClipboardList,
  Users,
  Calendar,
  Loader2,
} from "lucide-react";
import { useData } from "@/hooks/use-swr-fetcher";

interface DashboardData {
  stats: {
    cohorts: number;
    students: number;
    assignments: number;
    publishedAssignments: number;
    submissions: number;
    pendingGrading: number;
  };
  myCohorts: Array<{
    cohort: {
      id: string;
      name: string;
      status: string;
      location: string;
    };
    role: string;
    stats: {
      enrolled: number;
      submissionsToGrade: number;
      attendanceRecorded: boolean;
    };
  }>;
  pendingSubmissions: Array<{
    id: string;
    status: string;
    submittedAt: string;
    user: {
      id: string;
      displayName: string | null;
      username: string;
      avatarUrl: string | null;
    };
    assignment: {
      id: string;
      title: string;
      dueDate: string;
      cohort: { name: string };
    };
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    cohort: { name: string };
    _count: { submissions: number };
  }>;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    priority: string;
    createdAt: string;
    cohort: { name: string };
    createdBy: { displayName: string | null; username: string };
  }>;
  todayAttendance: Array<{
    status: string;
    count: number;
  }>;
}

export default function StaffDashboard() {
  const { user } = useAuth();

  // Use SWR for caching - data persists when navigating away and back
  const { data, isLoading: loading } = useData<DashboardData>("/api/dashboard/staff", {
    // Keep data fresh for 2 minutes before revalidating
    dedupingInterval: 120000,
    // Don't refetch on focus
    revalidateOnFocus: false,
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "default";
      case "LATE":
        return "destructive";
      case "GRADED":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Only show loading spinner if no cached data
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.displayName || user?.username}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your teaching overview
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.stats.cohorts || 0}</p>
                <p className="text-sm text-muted-foreground">My Cohorts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{data?.stats.pendingGrading || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Grading</p>
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
                <p className="text-2xl font-bold text-emerald-600">{data?.stats.students || 0}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{data?.upcomingAssignments?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Cohorts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Cohorts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff/cohorts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {data?.myCohorts && data.myCohorts.length > 0 ? (
              data.myCohorts.map((item) => (
                <Link
                  key={item.cohort.id}
                  href={`/staff/cohorts/${item.cohort.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FolderKanban className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.cohort.name}</h4>
                      <Badge variant="secondary">
                        {item.role.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.stats.enrolled} students &bull; {item.cohort.location}
                    </p>
                  </div>
                  {item.stats.submissionsToGrade > 0 && (
                    <Badge variant="default">
                      {item.stats.submissionsToGrade} to grade
                    </Badge>
                  )}
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                You are not assigned to any cohorts yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.upcomingAssignments && data.upcomingAssignments.length > 0 ? (
              data.upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="text-primary font-medium">
                      {formatDate(assignment.dueDate)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{assignment.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.cohort.name} &bull; {assignment._count.submissions} submitted
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No upcoming deadlines
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Grading & Today's Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Grading */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Submissions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff/grading">Grade all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.pendingSubmissions && data.pendingSubmissions.length > 0 ? (
              data.pendingSubmissions.slice(0, 5).map((submission) => (
                <Link
                  key={submission.id}
                  href={`/staff/grading`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    {submission.user.avatarUrl && (
                      <AvatarImage src={submission.user.avatarUrl} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(submission.user.displayName || submission.user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {submission.user.displayName || submission.user.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {submission.assignment.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusVariant(submission.status)}>
                      {submission.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(new Date(submission.submittedAt))}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No pending submissions
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today&apos;s Attendance</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff/attendance">Take attendance</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data?.todayAttendance && data.todayAttendance.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {data.todayAttendance.map((item) => (
                  <div key={item.status} className="p-4 rounded-xl bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-sm text-muted-foreground">{item.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No attendance recorded today</p>
                <Button variant="default" size="sm" className="mt-4" asChild>
                  <Link href="/staff/attendance">Take Attendance</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Announcements */}
      {data?.recentAnnouncements && data.recentAnnouncements.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Announcements</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff/announcements">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.recentAnnouncements.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={announcement.priority === "URGENT" ? "destructive" : "secondary"}>
                      {announcement.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {announcement.cohort.name}
                    </span>
                  </div>
                  <p className="font-medium line-clamp-2">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    by {announcement.createdBy.displayName || announcement.createdBy.username}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
