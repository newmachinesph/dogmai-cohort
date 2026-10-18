"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate, daysUntil } from "@/lib/utils";
import {
  PlayCircle,
  CheckCircle,
  BarChart3,
  BookOpen,
  Calendar,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { useData } from "@/hooks/use-swr-fetcher";

interface DashboardData {
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    cohort: {
      id: string;
      name: string;
      status: string;
      location: string;
      startDate: string;
      endDate: string;
    };
  }>;
  progress: {
    lessons: {
      total: number;
      completed: number;
      inProgress: number;
      percentage: number;
    };
    assignments: {
      total: number;
      submitted: number;
      graded: number;
      percentage: number;
    };
    averageGrade: number;
    attendance: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      rate: number;
    };
  };
  pendingAssignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    cohort: { name: string };
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    cohort: { name: string };
    mySubmission: { status: string; score: number | null } | null;
  }>;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    priority: string;
    publishedAt: string;
    cohort: { name: string };
    createdBy: { displayName: string | null; username: string };
  }>;
  recentGrades: Array<{
    id: string;
    score: number | null;
    gradedAt: string;
    assignment: {
      id: string;
      title: string;
      maxPoints: number;
      passingScore: number;
      cohort: { name: string };
    };
  }>;
}

export default function StudentDashboard() {
  const { user } = useAuth();

  // Use SWR for caching - data persists when navigating away and back
  const { data, isLoading: loading } = useData<DashboardData>("/api/dashboard/student", {
    // Keep data fresh for 2 minutes before revalidating
    dedupingInterval: 120000,
    // Don't refetch on focus
    revalidateOnFocus: false,
  });

  // Only show loading spinner if no cached data
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeEnrollment = data?.enrollments?.find(e => e.status === "ACTIVE");
  const progress = data?.progress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.displayName || user?.username}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeEnrollment ? (
              <>
                {activeEnrollment.cohort.name} &bull; {activeEnrollment.cohort.location}
              </>
            ) : (
              "No active enrollment"
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/student/lessons">
            <PlayCircle className="w-4 h-4 mr-2" />
            Continue Learning
          </Link>
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Progress</p>
                <p className="text-3xl font-bold">{progress?.lessons.percentage || 0}%</p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={220}
                    strokeDashoffset={220 - (220 * (progress?.lessons.percentage || 0)) / 100}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {progress?.lessons.percentage || 0}%
                </span>
              </div>
            </div>
            <Progress value={progress?.lessons.percentage || 0} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {progress?.lessons.completed || 0} of {progress?.lessons.total || 0} lessons completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                <p className="text-3xl font-bold text-emerald-600">{progress?.attendance.rate || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold text-blue-600">{progress?.averageGrade || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assignment Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-primary">{progress?.assignments.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-emerald-600">{progress?.assignments.submitted || 0}</p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-blue-600">{progress?.assignments.graded || 0}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
            <Progress value={progress?.assignments.percentage || 0} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {progress?.assignments.percentage || 0}% of assignments completed
            </p>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Announcements</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/announcements">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.recentAnnouncements && data.recentAnnouncements.length > 0 ? (
              data.recentAnnouncements.slice(0, 3).map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-3 rounded-xl bg-muted/50 border-l-2 border-primary"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={announcement.priority === "URGENT" || announcement.priority === "HIGH" ? "destructive" : "secondary"}>
                      {announcement.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{announcement.cohort.name}</span>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{announcement.title}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No announcements yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignments & Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Assignments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/assignments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.upcomingAssignments && data.upcomingAssignments.length > 0 ? (
              data.upcomingAssignments.map((assignment) => {
                const days = daysUntil(new Date(assignment.dueDate));
                const hasSubmitted = assignment.mySubmission !== null;

                return (
                  <Link
                    key={assignment.id}
                    href={`/student/assignments`}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {formatDate(assignment.dueDate)}
                        </p>
                      </div>
                    </div>
                    {hasSubmitted ? (
                      <Badge variant="secondary">Submitted</Badge>
                    ) : (
                      <Badge variant={days <= 3 ? "destructive" : "secondary"}>
                        {days <= 0 ? "Due today" : `${days} days left`}
                      </Badge>
                    )}
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No upcoming assignments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Grades</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/progress">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.recentGrades && data.recentGrades.length > 0 ? (
              data.recentGrades.map((grade) => {
                const passed = (grade.score || 0) >= grade.assignment.passingScore;
                const percentage = Math.round(((grade.score || 0) / grade.assignment.maxPoints) * 100);

                return (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{grade.assignment.title}</p>
                      <Badge variant={passed ? "default" : "destructive"}>
                        {passed ? "PASSED" : "NEEDS WORK"}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
                        {grade.score}
                      </p>
                      <p className="text-xs text-muted-foreground">/ {grade.assignment.maxPoints} ({percentage}%)</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No grades yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Info */}
      {activeEnrollment && (
        <Card>
          <CardHeader>
            <CardTitle>Your Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="p-3 rounded-xl bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{activeEnrollment.cohort.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeEnrollment.cohort.location} &bull; {activeEnrollment.cohort.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {formatDate(activeEnrollment.cohort.startDate)} - {formatDate(activeEnrollment.cohort.endDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
