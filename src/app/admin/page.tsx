"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  UserCog,
  ClipboardList,
  Plus,
  UserPlus,
  BookOpen,
  BarChart3,
  Loader2,
} from "lucide-react";
import { formatRelativeTime, calculatePercentage } from "@/lib/utils";
import { useData } from "@/hooks/use-swr-fetcher";

interface DashboardStats {
  users: {
    total: number;
    students: number;
    staff: number;
    active: number;
  };
  cohorts: {
    total: number;
    active: number;
    upcoming: number;
    completed: number;
  };
  enrollments: {
    total: number;
    active: number;
  };
  assignments: {
    total: number;
    submissions: number;
    pendingGrading: number;
  };
}

interface ActiveCohort {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  _count: {
    enrollments: number;
    staffAssignments: number;
    assignments: number;
  };
}

interface RecentEnrollment {
  id: string;
  enrolledAt: string;
  user: {
    id: string;
    displayName: string | null;
    username: string;
  };
  cohort: {
    id: string;
    name: string;
  };
}

interface DashboardData {
  stats: DashboardStats;
  activeCohorts: ActiveCohort[];
  recent: {
    enrollments: RecentEnrollment[];
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();

  // Use SWR for caching - data persists when navigating away and back
  const { data, error, isLoading: loading } = useData<DashboardData>("/api/dashboard/admin", {
    // Keep data fresh for 5 minutes before revalidating
    dedupingInterval: 300000,
    // Don't refetch on focus - dashboard data doesn't change that often
    revalidateOnFocus: false,
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "UPCOMING":
        return "secondary";
      case "COMPLETED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getCohortProgress = (cohort: ActiveCohort) => {
    const start = new Date(cohort.startDate).getTime();
    const end = new Date(cohort.endDate).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    return calculatePercentage(now - start, end - start);
  };

  // Only show loading spinner if no cached data
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || (!loading && !data)) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">{error?.message || "Failed to load dashboard"}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // At this point, data is guaranteed to exist (either fresh or cached)
  if (!data) return null;

  const { stats, activeCohorts, recent } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.displayName || user?.username}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your cohorts
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cohorts</p>
                <p className="text-3xl font-bold">{stats.cohorts.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <FolderKanban className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-emerald-600 font-medium">{stats.cohorts.active}</span> active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold">{stats.users.students}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="text-emerald-600 font-medium">{stats.enrollments.active}</span> currently enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Staff Members</p>
                <p className="text-3xl font-bold">{stats.users.staff}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <UserCog className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Instructors, TAs & mentors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Submissions</p>
                <p className="text-3xl font-bold text-primary">{stats.assignments.pendingGrading}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Awaiting grading
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cohorts Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Cohorts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/cohorts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCohorts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active cohorts</p>
                <Button asChild className="mt-4">
                  <Link href="/admin/cohorts/new">Create Cohort</Link>
                </Button>
              </div>
            ) : (
              activeCohorts.map((cohort) => (
                <Link
                  key={cohort.id}
                  href={`/admin/cohorts/${cohort.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors block"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{cohort.name}</h4>
                      <Badge variant={getStatusVariant(cohort.status)}>
                        {cohort.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {cohort._count.enrollments} students enrolled
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{getCohortProgress(cohort)}%</span>
                    </div>
                    <Progress value={getCohortProgress(cohort)} className="h-2" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.enrollments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent enrollments</p>
            ) : (
              recent.enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">
                        {enrollment.user.displayName || enrollment.user.username}
                      </span>{" "}
                      enrolled in{" "}
                      <span className="font-medium">{enrollment.cohort.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(enrollment.enrolledAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/cohorts/new"
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20 transition-all"
            >
              <div className="p-3 rounded-xl bg-primary/10">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium">New Cohort</span>
            </Link>
            <Link
              href="/admin/users/new"
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-emerald-500/20 transition-all"
            >
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <UserPlus className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-sm font-medium">Add User</span>
            </Link>
            <Link
              href="/admin/curriculum"
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-blue-500/20 transition-all"
            >
              <div className="p-3 rounded-xl bg-blue-500/10">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Edit Curriculum</span>
            </Link>
            <Link
              href="/admin/cohorts"
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-purple-500/20 transition-all"
            >
              <div className="p-3 rounded-xl bg-purple-500/10">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium">View Cohorts</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
