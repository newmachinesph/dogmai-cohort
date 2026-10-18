"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Clock,
  Video,
  BookOpen,
  CheckCircle,
  PlayCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface LessonProgress {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface SiblingLesson {
  id: string;
  title: string;
  slug: string;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: unknown[];
  difficulty: string;
  estimatedTime: number | null;
  order: number;
  isPublished: boolean;
  videoUrl: string | null;
  resources: unknown[];
  module: {
    id: string;
    title: string;
    slug: string;
    orderIndex: number;
    lessons: SiblingLesson[];
  };
  lessonProgress?: LessonProgress[];
}

export default function StudentLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Lesson not found");
            router.push("/student/lessons");
            return;
          }
          throw new Error("Failed to fetch lesson");
        }
        const data = await res.json();
        setLesson(data.lesson);

        // Mark as started if not already
        if (!data.lesson.lessonProgress?.length) {
          await fetch(`/api/lessons/${id}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "IN_PROGRESS" }),
          });
        }
      } catch (error) {
        console.error("Error fetching lesson:", error);
        toast.error("Failed to load lesson");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id, router]);

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    try {
      const res = await fetch(`/api/lessons/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!res.ok) throw new Error("Failed to update progress");

      // Refresh lesson data
      const refreshRes = await fetch(`/api/lessons/${id}`);
      const refreshData = await refreshRes.json();
      setLesson(refreshData.lesson);
      toast.success("Lesson marked as complete!");
    } catch (error) {
      console.error("Error marking complete:", error);
      toast.error("Failed to mark lesson as complete");
    } finally {
      setMarkingComplete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Lesson not found</p>
        <Button asChild className="mt-4">
          <Link href="/student/lessons">Back to Lessons</Link>
        </Button>
      </div>
    );
  }

  const progress = lesson.lessonProgress?.[0];
  const isCompleted = progress?.status === "COMPLETED";
  const isInProgress = progress?.status === "IN_PROGRESS";

  // Find adjacent lessons
  const lessonIndex = lesson.module.lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? lesson.module.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex < lesson.module.lessons.length - 1 ? lesson.module.lessons[lessonIndex + 1] : null;

  // Calculate module progress
  const completedLessons = lesson.module.lessons.filter(
    (l) => l.order <= lesson.order && isCompleted
  ).length;
  const moduleProgress = Math.round(
    ((lessonIndex + (isCompleted ? 1 : 0)) / lesson.module.lessons.length) * 100
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-emerald-500/10 text-emerald-600";
      case "INTERMEDIATE":
        return "bg-amber-500/10 text-amber-600";
      case "ADVANCED":
        return "bg-red-500/10 text-red-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/student/lessons">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            {isCompleted ? (
              <Badge className="bg-emerald-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : isInProgress ? (
              <Badge variant="secondary">
                <PlayCircle className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground">
            {lesson.module.title} - Lesson {lessonIndex + 1} of {lesson.module.lessons.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Module Progress</span>
            <span className="text-sm text-muted-foreground">{moduleProgress}%</span>
          </div>
          <Progress value={moduleProgress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video */}
          {lesson.videoUrl && (
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted flex items-center justify-center rounded-lg overflow-hidden">
                  {lesson.videoUrl.includes("youtube.com") ||
                  lesson.videoUrl.includes("youtu.be") ? (
                    <iframe
                      className="w-full h-full"
                      src={lesson.videoUrl.replace("watch?v=", "embed/")}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <a
                      href={lesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-4 text-muted-foreground hover:text-primary"
                    >
                      <Video className="h-16 w-16" />
                      <span>Watch Video</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lesson Content */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Content</CardTitle>
              {lesson.description && <CardDescription>{lesson.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              {lesson.content && lesson.content.length > 0 ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {/* Render content blocks - simplified for now */}
                  <p className="text-muted-foreground">
                    This lesson contains {lesson.content.length} content blocks.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No content available for this lesson yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resources */}
          {lesson.resources && lesson.resources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lesson.resources.map((resource: unknown, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span>{JSON.stringify(resource)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Mark Complete / Navigation */}
          <div className="flex items-center justify-between">
            {prevLesson ? (
              <Button variant="outline" asChild>
                <Link href={`/student/lessons/${prevLesson.id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous: {prevLesson.title}
                </Link>
              </Button>
            ) : (
              <div />
            )}

            {!isCompleted ? (
              <Button onClick={handleMarkComplete} disabled={markingComplete}>
                {markingComplete ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark as Complete
              </Button>
            ) : nextLesson ? (
              <Button asChild>
                <Link href={`/student/lessons/${nextLesson.id}`}>
                  Next: {nextLesson.title}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/student/lessons">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Module Complete!
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lesson Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lesson Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getDifficultyColor(lesson.difficulty)}>{lesson.difficulty}</Badge>
              </div>

              {lesson.estimatedTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{lesson.estimatedTime} minutes</span>
                </div>
              )}

              {lesson.videoUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <span>Video included</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module Lessons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">In This Module</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lesson.module.lessons.map((l, index) => (
                <Link
                  key={l.id}
                  href={`/student/lessons/${l.id}`}
                  className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
                    l.id === lesson.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      l.order < lesson.order || (l.id === lesson.id && isCompleted)
                        ? "bg-emerald-500 text-white"
                        : l.id === lesson.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {l.order < lesson.order || (l.id === lesson.id && isCompleted) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="flex-1 truncate">{l.title}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
