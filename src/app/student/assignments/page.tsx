"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, daysUntil } from "@/lib/utils";
import { ClipboardList, CheckCircle, FileText, BarChart3, Github, FileIcon, Type, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  submissionType: string;
  isPublished: boolean;
  module: {
    id: string;
    title: string;
  } | null;
  cohort: {
    id: string;
    name: string;
  };
  submission?: {
    id: string;
    status: string;
    score: number | null;
    submittedAt: string;
  } | null;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/assignments?myAssignments=true&limit=100");
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const pendingAssignments = assignments.filter(
    (a) => !a.submission || !["GRADED"].includes(a.submission.status)
  );
  const gradedAssignments = assignments.filter(
    (a) => a.submission?.status === "GRADED"
  );

  const filteredAssignments = activeTab === "pending" ? pendingAssignments : gradedAssignments;

  const avgScore =
    gradedAssignments.length > 0
      ? Math.round(
          gradedAssignments
            .filter((a) => a.submission?.score !== null)
            .reduce((sum, a) => sum + (a.submission?.score || 0), 0) /
            gradedAssignments.filter((a) => a.submission?.score !== null).length
        )
      : 0;

  const getSubmissionIcon = (type: string) => {
    switch (type) {
      case "GITHUB":
        return <Github className="w-4 h-4" />;
      case "FILE":
        return <FileIcon className="w-4 h-4" />;
      case "TEXT":
        return <Type className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const isPastDate = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="text-muted-foreground mt-1">View and submit your assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{pendingAssignments.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
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
                <p className="text-2xl font-bold text-emerald-600">{gradedAssignments.length}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({gradedAssignments.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Assignments */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {activeTab === "pending" ? "No pending assignments" : "No graded assignments"}
              </h3>
              <p className="text-muted-foreground">
                {activeTab === "pending"
                  ? "You're all caught up! Check back later for new assignments."
                  : "Your graded assignments will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assignment) => {
            const days = daysUntil(assignment.dueDate);
            const isOverdue = isPastDate(assignment.dueDate) && !assignment.submission;
            const isGraded = assignment.submission?.status === "GRADED";

            return (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge>{assignment.module?.title || assignment.cohort.name}</Badge>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {getSubmissionIcon(assignment.submissionType)}
                      <span className="text-xs">{assignment.submissionType}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{assignment.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {assignment.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      {isGraded ? (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-emerald-600">
                            {assignment.submission?.score ?? 0}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            / {assignment.maxPoints}
                          </span>
                          <Badge
                            variant={
                              (assignment.submission?.score ?? 0) >= assignment.maxPoints * 0.6
                                ? "default"
                                : "destructive"
                            }
                          >
                            {(assignment.submission?.score ?? 0) >= assignment.maxPoints * 0.6
                              ? "Passed"
                              : "Failed"}
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Due {formatDate(assignment.dueDate)}
                          </span>
                          {isOverdue ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : days <= 3 && days >= 0 ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              {days} days left
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <Button
                      variant={isGraded ? "outline" : "default"}
                      size="sm"
                      asChild
                    >
                      <Link href={`/student/assignments/${assignment.id}`}>
                        {isGraded ? "View" : assignment.submission ? "Update" : "Submit"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
