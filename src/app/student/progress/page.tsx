"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, CheckCircle, Loader2, BookOpen } from "lucide-react";

interface DashboardData {
  enrollments: Array<{
    id: string;
    status: string;
    cohort: {
      id: string;
      name: string;
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
  recentGrades: Array<{
    id: string;
    score: number;
    gradedAt: string;
    assignment: {
      id: string;
      title: string;
      maxPoints: number;
      cohort: { name: string };
    };
  }>;
  message?: string;
}

export default function ProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/student");
      if (!res.ok) throw new Error("Failed to fetch progress data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching progress:", err);
      setError("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  // Show message for unenrolled users
  if (data?.message || !data?.enrollments?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Progress</h1>
          <p className="text-muted-foreground mt-1">Track your learning journey</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Progress Yet</h3>
              <p className="text-muted-foreground">
                {data?.message || "You are not enrolled in any active cohorts yet. Your progress will appear here once you're enrolled."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { progress, recentGrades, enrollments } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground mt-1">Track your learning journey</p>
      </div>

      {/* Enrolled Cohorts */}
      {enrollments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {enrollments.filter(e => e.status === 'ACTIVE').map((enrollment) => (
            <Badge key={enrollment.id} variant="secondary">
              {enrollment.cohort.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Course Completion</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {progress.lessons.completed} of {progress.lessons.total} lessons completed
                </p>
                <Progress value={progress.lessons.percentage} className="h-3" />
                <p className="text-right text-sm text-muted-foreground mt-1">
                  {progress.lessons.percentage}%
                </p>
              </div>
              <div className="ml-6 relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={251}
                    strokeDashoffset={251 - (251 * progress.lessons.percentage) / 100}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {progress.lessons.percentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold text-emerald-600">{progress.averageGrade}%</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                <p className="text-3xl font-bold text-blue-600">
                  {progress.attendance.rate}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <p className="text-2xl font-bold">{progress.assignments.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <p className="text-2xl font-bold text-primary">{progress.assignments.submitted}</p>
              <p className="text-sm text-muted-foreground">Submitted</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <p className="text-2xl font-bold text-emerald-600">{progress.assignments.graded}</p>
              <p className="text-sm text-muted-foreground">Graded</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{progress.assignments.percentage}%</span>
            </div>
            <Progress value={progress.assignments.percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Grade History & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Grades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentGrades.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No graded assignments yet
              </p>
            ) : (
              recentGrades.map((grade) => {
                const percentage = (grade.score / grade.assignment.maxPoints) * 100;
                const passed = percentage >= 60;

                return (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{grade.assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(grade.gradedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge variant={passed ? "default" : "destructive"}>
                        {passed ? "Passed" : "Failed"}
                      </Badge>
                      <div>
                        <span
                          className={`text-xl font-bold ${
                            passed ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {grade.score}
                        </span>
                        <span className="text-sm text-muted-foreground">/{grade.assignment.maxPoints}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {progress.attendance.total === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No attendance records yet
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-3xl font-bold text-emerald-600">{progress.attendance.present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-3xl font-bold text-red-600">{progress.attendance.absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-3xl font-bold text-primary">{progress.attendance.late}</p>
                    <p className="text-sm text-muted-foreground">Late</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-3xl font-bold text-blue-600">{progress.attendance.excused}</p>
                    <p className="text-sm text-muted-foreground">Excused</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Classes</span>
                    <span className="font-medium">{progress.attendance.total}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-medium text-emerald-600">
                      {progress.attendance.rate}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
