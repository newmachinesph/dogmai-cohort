"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  FileText,
  Users,
  Edit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils";

interface Submission {
  id: string;
  status: string;
  content: string | null;
  files: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
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
  rubric: unknown;
  submissionType: string;
  maxFileSize: number;
  allowedFormats: string[] | null;
  isPublished: boolean;
  createdAt: string;
  cohort: { id: string; name: string; slug: string };
  module: { id: string; title: string; week: number } | null;
  submissions: Submission[];
  _count: { submissions: number };
}

export default function StaffAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeData, setGradeData] = useState({ score: "", feedback: "" });

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const res = await fetch(`/api/assignments/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Assignment not found");
            router.push("/staff/assignments");
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

  const handleTogglePublish = async () => {
    if (!assignment) return;

    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !assignment.isPublished }),
      });

      if (!res.ok) throw new Error("Failed to update assignment");

      const data = await res.json();
      setAssignment((prev) =>
        prev ? { ...prev, isPublished: data.assignment.isPublished } : null
      );
      toast.success(
        data.assignment.isPublished ? "Assignment published" : "Assignment unpublished"
      );
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    }
  };

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeData({
      score: submission.score?.toString() || "",
      feedback: submission.feedback || "",
    });
    setGradeDialogOpen(true);
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !assignment) return;

    const score = parseFloat(gradeData.score);
    if (isNaN(score) || score < 0 || score > assignment.maxPoints) {
      toast.error(`Score must be between 0 and ${assignment.maxPoints}`);
      return;
    }

    setGrading(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "GRADED",
          score,
          feedback: gradeData.feedback,
        }),
      });

      if (!res.ok) throw new Error("Failed to grade submission");

      const data = await res.json();
      setAssignment((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          submissions: prev.submissions.map((s) =>
            s.id === selectedSubmission.id
              ? { ...s, ...data.submission }
              : s
          ),
        };
      });

      toast.success("Submission graded successfully");
      setGradeDialogOpen(false);
    } catch (error) {
      console.error("Error grading submission:", error);
      toast.error("Failed to grade submission");
    } finally {
      setGrading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="secondary">Submitted</Badge>;
      case "GRADED":
        return <Badge className="bg-emerald-500">Graded</Badge>;
      case "LATE":
        return <Badge variant="destructive">Late</Badge>;
      case "RESUBMITTED":
        return <Badge className="bg-amber-500">Resubmitted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isPastDue = (date: string) => new Date(date) < new Date();

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
          <Link href="/staff/assignments">Back to Assignments</Link>
        </Button>
      </div>
    );
  }

  const gradedCount = assignment.submissions.filter((s) => s.status === "GRADED").length;
  const pendingCount = assignment.submissions.filter((s) => s.status !== "GRADED").length;
  const avgScore =
    gradedCount > 0
      ? assignment.submissions
          .filter((s) => s.score !== null)
          .reduce((sum, s) => sum + (s.score || 0), 0) / gradedCount
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{assignment.title}</h1>
              <Badge variant={assignment.isPublished ? "default" : "outline"}>
                {assignment.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{assignment.cohort.name}</span>
              {assignment.module && (
                <>
                  <span>•</span>
                  <span>Week {assignment.module.week}: {assignment.module.title}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTogglePublish}>
              {assignment.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button asChild>
              <Link href={`/staff/assignments/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {formatDate(assignment.dueDate)}
                {isPastDue(assignment.dueDate) && (
                  <Badge variant="secondary" className="ml-2">Past Due</Badge>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submissions</p>
              <p className="font-medium">{assignment._count.submissions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="font-medium">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Score</p>
              <p className="font-medium">
                {gradedCount > 0 ? `${avgScore.toFixed(1)} / ${assignment.maxPoints}` : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">
            Submissions ({assignment.submissions.length})
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Student Submissions</CardTitle>
              <CardDescription>
                Review and grade student submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignment.submissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignment.submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={submission.user.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(
                                  submission.user.displayName || submission.user.username
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {submission.user.displayName || submission.user.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {submission.user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{formatDate(submission.submittedAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(submission.submittedAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          {submission.score !== null ? (
                            <span
                              className={
                                submission.score >= assignment.passingScore
                                  ? "text-emerald-600 font-medium"
                                  : "text-destructive font-medium"
                              }
                            >
                              {submission.score} / {assignment.maxPoints}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGradeDialog(submission)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {submission.status === "GRADED" ? "Review" : "Grade"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{assignment.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {assignment.instructions}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Submission Type</p>
                    <p className="font-medium">{assignment.submissionType}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Max Points</p>
                    <p className="font-medium">{assignment.maxPoints}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Passing Score</p>
                    <p className="font-medium">{assignment.passingScore}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Max File Size</p>
                    <p className="font-medium">{assignment.maxFileSize} MB</p>
                  </div>
                  {assignment.lateDeadline && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Late Deadline</p>
                      <p className="font-medium">{formatDate(assignment.lateDeadline)}</p>
                    </div>
                  )}
                  {assignment.allowedFormats && assignment.allowedFormats.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Allowed Formats</p>
                      <p className="font-medium">{assignment.allowedFormats.join(", ")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <span>
                  Submission by{" "}
                  {selectedSubmission.user.displayName || selectedSubmission.user.username}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              {/* Submission Content */}
              <div className="p-4 rounded-lg bg-muted/50 max-h-64 overflow-y-auto">
                <h4 className="font-medium mb-2">Submitted Content</h4>
                {selectedSubmission.content ? (
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedSubmission.content}
                  </p>
                ) : selectedSubmission.files ? (
                  <div className="space-y-2">
                    {JSON.parse(selectedSubmission.files).map(
                      (file: { name: string; url: string }, i: number) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Download className="h-4 w-4" />
                          {file.name}
                        </a>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No content</p>
                )}
              </div>

              {/* Grading Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Score (out of {assignment.maxPoints})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={assignment.maxPoints}
                    value={gradeData.score}
                    onChange={(e) =>
                      setGradeData({ ...gradeData, score: e.target.value })
                    }
                    placeholder={`0 - ${assignment.maxPoints}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback (optional)</label>
                  <Textarea
                    value={gradeData.feedback}
                    onChange={(e) =>
                      setGradeData({ ...gradeData, feedback: e.target.value })
                    }
                    placeholder="Provide feedback for the student..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGradeSubmission} disabled={grading}>
              {grading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
