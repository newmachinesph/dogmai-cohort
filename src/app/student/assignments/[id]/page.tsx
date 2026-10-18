"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Calendar,
  FileText,
  Github,
  Link as LinkIcon,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, daysUntil } from "@/lib/utils";

interface RubricItem {
  criteria: string;
  points: number;
  description: string;
}

interface Submission {
  id: string;
  status: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  lateDeadline: string | null;
  maxPoints: number;
  passingScore: number;
  submissionType: string;
  maxFileSize: number;
  rubric: RubricItem[] | null;
  cohort: {
    id: string;
    name: string;
  };
  module: {
    id: string;
    title: string;
  } | null;
  submissions: Submission[];
}

export default function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Submission form state
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const res = await fetch(`/api/assignments/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Assignment not found");
            router.push("/student/assignments");
            return;
          }
          throw new Error("Failed to fetch assignment");
        }
        const data = await res.json();
        setAssignment(data.assignment);
      } catch (error) {
        console.error("Error fetching assignment:", error);
        toast.error("Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content && !fileUrl) {
      toast.error("Please provide your submission");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: id,
          content: content || null,
          fileUrl: fileUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      toast.success("Assignment submitted successfully!");
      // Refresh to show the submission
      const refreshRes = await fetch(`/api/assignments/${id}`);
      const refreshData = await refreshRes.json();
      setAssignment(refreshData.assignment);
      setContent("");
      setFileUrl("");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Assignment not found</p>
        <Button asChild className="mt-4">
          <Link href="/student/assignments">Back to Assignments</Link>
        </Button>
      </div>
    );
  }

  const submission = assignment.submissions[0];
  const hasSubmitted = !!submission;
  const isGraded = submission?.status === "GRADED";
  const isPastDue = new Date(assignment.dueDate) < new Date();
  const isPastLateDue = assignment.lateDeadline && new Date(assignment.lateDeadline) < new Date();
  const canSubmit = !isPastLateDue && (!hasSubmitted || !isGraded);
  const daysLeft = daysUntil(assignment.dueDate);

  const getStatusBadge = () => {
    if (isGraded) {
      const passed = submission.score !== null && submission.score >= assignment.passingScore;
      return passed ? (
        <Badge className="bg-emerald-500">Passed</Badge>
      ) : (
        <Badge variant="destructive">Needs Improvement</Badge>
      );
    }
    if (hasSubmitted) {
      return <Badge variant="secondary">Submitted - Awaiting Grade</Badge>;
    }
    if (isPastDue) {
      return <Badge variant="destructive">Past Due</Badge>;
    }
    if (daysLeft <= 3) {
      return <Badge className="bg-amber-500">Due Soon</Badge>;
    }
    return <Badge variant="outline">Open</Badge>;
  };

  const getSubmissionTypeLabel = () => {
    switch (assignment.submissionType) {
      case "FILE":
        return "File Upload";
      case "TEXT":
        return "Text Entry";
      case "URL":
        return "URL/Link";
      case "GITHUB":
        return "GitHub Repository";
      default:
        return assignment.submissionType;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/student/assignments">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            {assignment.cohort.name}
            {assignment.module && ` - ${assignment.module.title}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{assignment.description}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Instructions</Label>
                <div className="mt-1 whitespace-pre-wrap">{assignment.instructions}</div>
              </div>

              {assignment.rubric && assignment.rubric.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Grading Rubric</Label>
                  <div className="mt-2 space-y-2">
                    {assignment.rubric.map((item, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{item.criteria}</span>
                          <Badge variant="outline">{item.points} pts</Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Submission */}
          {submission && (
            <Card>
              <CardHeader>
                <CardTitle>Your Submission</CardTitle>
                <CardDescription>
                  Submitted {formatRelativeTime(submission.submittedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission.content && (
                  <div>
                    <Label className="text-muted-foreground">Your Response</Label>
                    <div className="mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                      {submission.content}
                    </div>
                  </div>
                )}

                {submission.fileUrl && (
                  <div>
                    <Label className="text-muted-foreground">Submitted File/URL</Label>
                    <div className="mt-1">
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {submission.fileName || submission.fileUrl}
                      </a>
                    </div>
                  </div>
                )}

                {isGraded && (
                  <>
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-muted-foreground">Score</Label>
                        <span
                          className={`text-2xl font-bold ${
                            submission.score !== null && submission.score >= assignment.passingScore
                              ? "text-emerald-600"
                              : "text-destructive"
                          }`}
                        >
                          {submission.score}/{assignment.maxPoints}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Passing score: {assignment.passingScore}
                      </p>
                    </div>

                    {submission.feedback && (
                      <div>
                        <Label className="text-muted-foreground">Instructor Feedback</Label>
                        <div className="mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                          {submission.feedback}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Form */}
          {canSubmit && (
            <Card>
              <CardHeader>
                <CardTitle>{hasSubmitted ? "Resubmit Assignment" : "Submit Assignment"}</CardTitle>
                <CardDescription>
                  {getSubmissionTypeLabel()} - Max {assignment.maxFileSize}MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(assignment.submissionType === "TEXT" || assignment.submissionType === "FILE") && (
                    <div className="space-y-2">
                      <Label htmlFor="content">Your Response</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter your response here..."
                        rows={6}
                      />
                    </div>
                  )}

                  {(assignment.submissionType === "URL" ||
                    assignment.submissionType === "GITHUB" ||
                    assignment.submissionType === "FILE") && (
                    <div className="space-y-2">
                      <Label htmlFor="fileUrl">
                        {assignment.submissionType === "GITHUB"
                          ? "GitHub Repository URL"
                          : assignment.submissionType === "URL"
                          ? "URL"
                          : "File URL"}
                      </Label>
                      <Input
                        id="fileUrl"
                        type="url"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder={
                          assignment.submissionType === "GITHUB"
                            ? "https://github.com/username/repo"
                            : "https://..."
                        }
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {hasSubmitted ? "Resubmit" : "Submit Assignment"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Due Date Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Due Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isPastDue ? "bg-destructive/10" : daysLeft <= 3 ? "bg-amber-500/10" : "bg-muted"
                  }`}
                >
                  <Calendar
                    className={`h-5 w-5 ${
                      isPastDue
                        ? "text-destructive"
                        : daysLeft <= 3
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <p className="font-medium">{formatDate(assignment.dueDate)}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPastDue ? "Past due" : `${daysLeft} days remaining`}
                  </p>
                </div>
              </div>

              {assignment.lateDeadline && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Late Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(assignment.lateDeadline)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Points Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Maximum Points</span>
                <span className="font-medium">{assignment.maxPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Passing Score</span>
                <span className="font-medium">{assignment.passingScore}</span>
              </div>
              {isGraded && submission.score !== null && (
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Your Score</span>
                  <span
                    className={`font-bold ${
                      submission.score >= assignment.passingScore
                        ? "text-emerald-600"
                        : "text-destructive"
                    }`}
                  >
                    {submission.score}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isGraded ? (
                  submission.score !== null && submission.score >= assignment.passingScore ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-600">Passed</p>
                        <p className="text-sm text-muted-foreground">Well done!</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Needs Improvement</p>
                        <p className="text-sm text-muted-foreground">Review feedback and resubmit</p>
                      </div>
                    </>
                  )
                ) : hasSubmitted ? (
                  <>
                    <Clock className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-600">Submitted</p>
                      <p className="text-sm text-muted-foreground">Awaiting grading</p>
                    </div>
                  </>
                ) : isPastDue ? (
                  <>
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-600">Not Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        {canSubmit ? "Submit now (late)" : "Deadline passed"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Not Submitted</p>
                      <p className="text-sm text-muted-foreground">Submit before due date</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
