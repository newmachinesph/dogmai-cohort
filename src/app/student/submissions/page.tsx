"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  assignment: {
    id: string;
    title: string;
    dueDate: string;
    maxPoints: number;
    module: { id: string; title: string } | null;
    cohort: { id: string; name: string };
  };
}

export default function StudentSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch("/api/submissions?mySubmissions=true");
        if (!res.ok) throw new Error("Failed to fetch submissions");
        const data = await res.json();
        setSubmissions(data.submissions || []);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter((s) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return ["SUBMITTED", "LATE", "GRADING"].includes(s.status);
    if (activeTab === "graded") return s.status === "GRADED";
    if (activeTab === "returned") return ["RETURNED", "RESUBMIT_REQUESTED"].includes(s.status);
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "GRADED":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "SUBMITTED":
      case "GRADING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "RESUBMIT_REQUESTED":
      case "RETURNED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "GRADED": return "default";
      case "SUBMITTED": return "secondary";
      case "LATE": return "destructive";
      case "GRADING": return "secondary";
      case "RESUBMIT_REQUESTED": return "destructive";
      default: return "outline";
    }
  };

  const pendingCount = submissions.filter(s => ["SUBMITTED", "LATE", "GRADING"].includes(s.status)).length;
  const gradedCount = submissions.filter(s => s.status === "GRADED").length;
  const avgScore = gradedCount > 0
    ? Math.round(submissions.filter(s => s.status === "GRADED" && s.score !== null)
        .reduce((sum, s) => sum + ((s.score || 0) / s.assignment.maxPoints * 100), 0) / gradedCount)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Submissions</h1>
        <p className="text-muted-foreground mt-1">Track your assignment submissions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submissions.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
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
                <p className="text-2xl font-bold text-emerald-600">{gradedCount}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({submissions.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({gradedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No submissions</h3>
            <p className="text-muted-foreground">
              {activeTab === "all"
                ? "You haven't submitted any assignments yet"
                : `No ${activeTab} submissions`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(submission.status)}
                    <Badge variant={getStatusVariant(submission.status)}>{submission.status}</Badge>
                    {submission.assignment.module && (
                      <Badge variant="outline">{submission.assignment.module.title}</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Submitted {formatDate(submission.submittedAt)}
                  </span>
                </div>
                <CardTitle className="mt-2">{submission.assignment.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    {submission.status === "GRADED" && submission.score !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{submission.score}</span>
                        <span className="text-muted-foreground">/ {submission.assignment.maxPoints}</span>
                        <Badge variant={submission.score >= submission.assignment.maxPoints * 0.6 ? "default" : "destructive"}>
                          {submission.score >= submission.assignment.maxPoints * 0.6 ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(submission.assignment.dueDate)}
                      </p>
                    )}
                    {submission.feedback && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        Feedback: {submission.feedback}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/student/assignments/${submission.assignment.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
