"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  FileText,
  Github,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime, getInitials } from "@/lib/utils";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

interface RubricItem {
  criteria: string;
  points: number;
  description?: string;
}

interface Comment {
  id: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  githubUrl: string | null;
  gradedAt: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  assignment: {
    id: string;
    title: string;
    description: string | null;
    maxPoints: number;
    passingScore: number;
    dueDate: string;
    rubric: RubricItem[] | null;
    cohort: {
      id: string;
      name: string;
      slug: string;
    };
    module: {
      id: string;
      title: string;
    } | null;
  };
  comments: Comment[];
}

export default function AdminGradingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [saving, setSaving] = useState(false);

  // Grading form state
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [formInitialized, setFormInitialized] = useState(false);

  // Comment form state
  const [newComment, setNewComment] = useState("");
  const [isPrivateComment, setIsPrivateComment] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  // Use SWR for caching
  const { data, error, isLoading: loading, mutate } = useSWR<{ submission: Submission }>(
    `/api/submissions/${submissionId}`,
    fetcher,
    {
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      onError: (err) => {
        toast.error("Failed to load submission");
      },
    }
  );

  const submission = data?.submission || null;

  // Initialize form with existing values when data loads
  useEffect(() => {
    if (submission && !formInitialized) {
      if (submission.score !== null) {
        setScore(submission.score);
      }
      if (submission.feedback) {
        setFeedback(submission.feedback);
      }
      setFormInitialized(true);
    }
  }, [submission, formInitialized]);

  const handleGrade = async () => {
    if (!submission) return;

    if (score < 0 || score > submission.assignment.maxPoints) {
      toast.error(`Score must be between 0 and ${submission.assignment.maxPoints}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback: feedback.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to grade submission");
      }

      toast.success("Submission graded successfully");
      mutate();
    } catch (error) {
      console.error("Error grading submission:", error);
      toast.error(error instanceof Error ? error.message : "Failed to grade submission");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setAddingComment(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          isPrivate: isPrivateComment,
        }),
      });

      if (!res.ok) throw new Error("Failed to add comment");

      toast.success("Comment added");
      setNewComment("");
      mutate();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "default";
      case "LATE":
        return "destructive";
      case "GRADED":
        return "secondary";
      case "DRAFT":
        return "outline";
      default:
        return "outline";
    }
  };

  const isPassing = submission && submission.score !== null
    ? submission.score >= submission.assignment.passingScore
    : null;

  // Only show loading spinner if no cached data
  if (loading && !submission) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Submission not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/grading">Back to Grading</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/grading">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Grade Submission</h1>
          <p className="text-muted-foreground">{submission.assignment.title}</p>
        </div>
        <Badge variant={getStatusVariant(submission.status)} className="text-sm">
          {submission.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Submission Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {submission.user.avatarUrl && (
                    <AvatarImage src={submission.user.avatarUrl} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(submission.user.displayName || submission.user.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {submission.user.displayName || submission.user.username}
                  </p>
                  <p className="text-sm text-muted-foreground">{submission.user.email}</p>
                  <p className="text-sm text-muted-foreground">{submission.assignment.cohort.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due:</span>
                  <span>{new Date(submission.assignment.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Submitted:</span>
                  <span>{formatRelativeTime(submission.submittedAt)}</span>
                </div>
              </div>

              {submission.assignment.module && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Module:</span>{" "}
                  <span>{submission.assignment.module.title}</span>
                </div>
              )}

              {submission.assignment.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description:</p>
                  <p className="text-sm">{submission.assignment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission.content && (
                <div>
                  <Label className="text-sm text-muted-foreground">Text Response</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {submission.content}
                  </div>
                </div>
              )}

              {submission.fileUrl && (
                <div>
                  <Label className="text-sm text-muted-foreground">Attached File</Label>
                  <div className="mt-2">
                    <Button variant="outline" asChild>
                      <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        {submission.fileName || "Download File"}
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {submission.githubUrl && (
                <div>
                  <Label className="text-sm text-muted-foreground">GitHub Repository</Label>
                  <div className="mt-2">
                    <Button variant="outline" asChild>
                      <a href={submission.githubUrl} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 mr-2" />
                        View Repository
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {!submission.content && !submission.fileUrl && !submission.githubUrl && (
                <p className="text-muted-foreground text-sm italic">No content submitted</p>
              )}
            </CardContent>
          </Card>

          {/* Rubric (if exists) */}
          {submission.assignment.rubric && submission.assignment.rubric.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grading Rubric</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submission.assignment.rubric.map((item, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.criteria}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{item.points} pts</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
              <CardDescription>Add feedback or notes for the student</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Comments */}
              {submission.comments.length > 0 && (
                <div className="space-y-3">
                  {submission.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg ${
                        comment.isPrivate ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          {comment.user.avatarUrl && (
                            <AvatarImage src={comment.user.avatarUrl} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.user.displayName || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {comment.user.displayName || "Staff"}
                        </span>
                        {comment.isPrivate && (
                          <Badge variant="outline" className="text-xs">Staff Only</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <Separator />
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isPrivateComment}
                      onChange={(e) => setIsPrivateComment(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-muted-foreground">Staff-only note (not visible to student)</span>
                  </label>
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                  >
                    {addingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Grading Form */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Grade Submission</CardTitle>
              <CardDescription>
                Max points: {submission.assignment.maxPoints} | Passing: {submission.assignment.passingScore}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Grade Status */}
              {submission.status === "GRADED" && submission.score !== null && (
                <div className={`p-4 rounded-lg ${isPassing ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isPassing ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${isPassing ? "text-emerald-600" : "text-red-600"}`}>
                      {isPassing ? "Passed" : "Not Passed"}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {submission.score}/{submission.assignment.maxPoints}
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      ({Math.round((submission.score / submission.assignment.maxPoints) * 100)}%)
                    </span>
                  </p>
                  {submission.gradedAt && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Graded {formatRelativeTime(submission.gradedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Score Input */}
              <div className="space-y-3">
                <Label htmlFor="score">Score</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[score]}
                    onValueChange={(values) => setScore(values[0])}
                    max={submission.assignment.maxPoints}
                    step={1}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      id="score"
                      type="number"
                      min={0}
                      max={submission.assignment.maxPoints}
                      value={score}
                      onChange={(e) => setScore(Math.min(submission.assignment.maxPoints, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-20 text-center"
                    />
                    <span className="text-muted-foreground">/ {submission.assignment.maxPoints}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0%</span>
                  <span className={score >= submission.assignment.passingScore ? "text-emerald-600 font-medium" : ""}>
                    {Math.round((score / submission.assignment.maxPoints) * 100)}%
                  </span>
                  <span>100%</span>
                </div>
                {score >= submission.assignment.passingScore ? (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Passing score
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Below passing ({submission.assignment.passingScore} required)
                  </p>
                )}
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback (visible to student)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleGrade}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : submission.status === "GRADED" ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Grade
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Grade
                  </>
                )}
              </Button>

              {submission.status !== "GRADED" && (
                <p className="text-xs text-center text-muted-foreground">
                  The student will be notified when you submit the grade
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
