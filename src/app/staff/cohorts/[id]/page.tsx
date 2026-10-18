"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Users,
  GraduationCap,
  Bell,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, getInitials } from "@/lib/utils";

interface Cohort {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  mode: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  status: string;
  enrollments: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
  staffAssignments: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      role: string;
    };
  }>;
  _count: {
    enrollments: number;
    staffAssignments: number;
    assignments: number;
    announcements: number;
    sessions: number;
  };
}

interface Stats {
  sessionsCompleted: number;
  totalSessions: number;
  averageAttendance: number;
  assignmentsPosted: number;
  submissionsReceived: number;
}

export default function CohortDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: cohortId } = use(params);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cohortRes = await fetch(`/api/cohorts/${cohortId}`);
        if (cohortRes.ok) {
          const data = await cohortRes.json();
          setCohort(data.cohort);
        }

        // Fetch stats
        const [sessionsRes, submissionsRes] = await Promise.all([
          fetch(`/api/sessions?cohortId=${cohortId}`),
          fetch(`/api/submissions?cohortId=${cohortId}`),
        ]);

        let sessionsCompleted = 0;
        let totalSessions = 0;

        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          totalSessions = data.sessions?.length || 0;
          sessionsCompleted = data.sessions?.filter(
            (s: { status: string }) => s.status === "COMPLETED"
          ).length || 0;
        }

        let submissionsReceived = 0;
        if (submissionsRes.ok) {
          const data = await submissionsRes.json();
          submissionsReceived = data.submissions?.length || 0;
        }

        setStats({
          sessionsCompleted,
          totalSessions,
          averageAttendance: 85, // Placeholder
          assignmentsPosted: 0,
          submissionsReceived,
        });
      } catch (error) {
        console.error("Error fetching cohort:", error);
        toast.error("Failed to load cohort details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cohortId]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "UPCOMING":
        return "secondary";
      case "COMPLETED":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cohort not found</p>
        <Button asChild className="mt-4">
          <Link href="/staff/cohorts">Back to Cohorts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff/cohorts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{cohort.name}</h1>
            <Badge variant={getStatusVariant(cohort.status)}>{cohort.status}</Badge>
          </div>
          {cohort.description && (
            <p className="text-muted-foreground mt-1">{cohort.description}</p>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{cohort.location}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">
                {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="font-medium">
                {cohort._count?.enrollments || 0} / {cohort.maxStudents}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Sessions</p>
              <p className="font-medium">
                {stats?.sessionsCompleted || 0} / {stats?.totalSessions || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/staff/cohorts/${cohortId}/sessions`}>
            <Calendar className="w-4 h-4 mr-2" />
            Sessions
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/staff/cohorts/${cohortId}/files`}>
            <FileText className="w-4 h-4 mr-2" />
            Files
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/staff/attendance">
            <CheckCircle className="w-4 h-4 mr-2" />
            Attendance
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/staff/announcements">
            <Bell className="w-4 h-4 mr-2" />
            Announcements
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">
            Students ({cohort.enrollments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="staff">
            Staff ({cohort.staffAssignments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Enrolled Students
              </CardTitle>
              <CardDescription>
                Students currently enrolled in this cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohort.enrollments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No students enrolled yet
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cohort.enrollments?.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <Avatar>
                        {enrollment.user.avatarUrl && (
                          <AvatarImage src={enrollment.user.avatarUrl} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(
                            enrollment.user.displayName || enrollment.user.username
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {enrollment.user.displayName || enrollment.user.username}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {enrollment.user.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          enrollment.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members
              </CardTitle>
              <CardDescription>
                Instructors and teaching assistants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohort.staffAssignments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No staff assigned yet
                </p>
              ) : (
                <div className="space-y-4">
                  {cohort.staffAssignments?.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <Avatar>
                        {assignment.user.avatarUrl && (
                          <AvatarImage src={assignment.user.avatarUrl} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(
                            assignment.user.displayName || assignment.user.username
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {assignment.user.displayName || assignment.user.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.user.email}
                        </p>
                      </div>
                      <Badge variant="outline">{assignment.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sessions Completed</span>
                    <span>
                      {stats?.sessionsCompleted || 0} / {stats?.totalSessions || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${
                          stats?.totalSessions
                            ? (stats.sessionsCompleted / stats.totalSessions) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Attendance</span>
                    <span>{stats?.averageAttendance || 0}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${stats?.averageAttendance || 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">
                      {cohort._count?.assignments || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Posted</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">
                      {stats?.submissionsReceived || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
