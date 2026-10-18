"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, PlayCircle, Lock, Clock, BookOpen, Loader2, Video } from "lucide-react";

interface LessonProgress {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface Lesson {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: string;
  estimatedTime: number | null;
  order: number;
  isPublished: boolean;
  videoUrl: string | null;
  module: {
    id: string;
    title: string;
    slug: string;
    orderIndex: number;
  };
  progress: LessonProgress | null;
}

interface ModuleWithLessons {
  id: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
  progress: number;
  completedCount: number;
  totalCount: number;
}

export default function LessonsPage() {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);

  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const data = await res.json();

      // Group lessons by module
      const moduleMap = new Map<string, ModuleWithLessons>();

      data.lessons.forEach((lesson: Lesson) => {
        const moduleId = lesson.module.id;
        if (!moduleMap.has(moduleId)) {
          moduleMap.set(moduleId, {
            id: moduleId,
            title: lesson.module.title,
            orderIndex: lesson.module.orderIndex,
            lessons: [],
            progress: 0,
            completedCount: 0,
            totalCount: 0,
          });
        }

        const module = moduleMap.get(moduleId)!;
        module.lessons.push(lesson);
        module.totalCount++;

        if (lesson.progress?.status === "COMPLETED") {
          module.completedCount++;
        }
      });

      // Calculate progress percentage and sort
      const modulesArray = Array.from(moduleMap.values())
        .map((module) => ({
          ...module,
          progress: module.totalCount > 0
            ? Math.round((module.completedCount / module.totalCount) * 100)
            : 0,
          lessons: module.lessons.sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex);

      setModules(modulesArray);

      // Select the first module that is in progress or not completed
      const inProgressIndex = modulesArray.findIndex(
        (m) => m.progress > 0 && m.progress < 100
      );
      if (inProgressIndex !== -1) {
        setSelectedModuleIndex(inProgressIndex);
      } else if (modulesArray.length > 0) {
        // Find first incomplete module or default to first
        const firstIncomplete = modulesArray.findIndex((m) => m.progress < 100);
        setSelectedModuleIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const getStatusIcon = (progress: LessonProgress | null) => {
    if (!progress || progress.status === "NOT_STARTED") {
      return <div className="w-6 h-6 rounded-full bg-muted border border-border" />;
    }
    if (progress.status === "COMPLETED") {
      return (
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      );
    }
    // IN_PROGRESS
    return (
      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
        <PlayCircle className="w-4 h-4 text-white" />
      </div>
    );
  };

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

  const filteredModules = selectedModuleIndex !== null
    ? [modules[selectedModuleIndex]]
    : modules;

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
        <h1 className="text-3xl font-bold">Lessons</h1>
        <p className="text-muted-foreground mt-1">Continue your learning journey</p>
      </div>

      {/* Module Filter */}
      {modules.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Button
                size="sm"
                variant={selectedModuleIndex === null ? "default" : "outline"}
                onClick={() => setSelectedModuleIndex(null)}
              >
                All Modules
              </Button>
              {modules.map((module, index) => (
                <Button
                  key={module.id}
                  size="sm"
                  variant={selectedModuleIndex === index ? "default" : "outline"}
                  onClick={() => setSelectedModuleIndex(index)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  {module.title}
                  {module.progress === 100 && (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modules */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No lessons available</h3>
              <p className="text-muted-foreground">
                Lessons will appear here once your cohort&apos;s curriculum is published.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredModules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Module {module.orderIndex + 1}</Badge>
                    <CardTitle>{module.title}</CardTitle>
                    {module.progress === 100 && (
                      <Badge className="bg-emerald-500">Completed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <Progress value={module.progress} className="h-2" />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                      {module.progress}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {module.lessons.map((lesson, index) => {
                    const isCompleted = lesson.progress?.status === "COMPLETED";
                    const isInProgress = lesson.progress?.status === "IN_PROGRESS";
                    const isAccessible = isCompleted || isInProgress || index === 0 ||
                      module.lessons[index - 1]?.progress?.status === "COMPLETED";

                    return (
                      <Link
                        key={lesson.id}
                        href={isAccessible ? `/student/lessons/${lesson.id}` : "#"}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                          isAccessible
                            ? "bg-muted/50 hover:bg-muted cursor-pointer"
                            : "bg-muted/20 cursor-not-allowed opacity-60"
                        }`}
                        onClick={(e) => !isAccessible && e.preventDefault()}
                      >
                        <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                        {getStatusIcon(lesson.progress)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-medium ${
                                !isAccessible ? "text-muted-foreground" : ""
                              }`}
                            >
                              {lesson.title}
                            </p>
                            <Badge className={getDifficultyColor(lesson.difficulty)}>
                              {lesson.difficulty}
                            </Badge>
                            {lesson.videoUrl && (
                              <Video className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {lesson.estimatedTime && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {lesson.estimatedTime} min
                            </div>
                          )}
                          {!isAccessible && <Lock className="w-4 h-4 text-muted-foreground" />}
                          {isInProgress && <Badge>Continue</Badge>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overall Progress Summary */}
      {modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold">
                  {modules.reduce((sum, m) => sum + m.completedCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold">
                  {modules.reduce((sum, m) => sum + m.totalCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold">
                  {modules.filter((m) => m.progress === 100).length}
                </p>
                <p className="text-sm text-muted-foreground">Modules Done</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">
                  {modules.length > 0
                    ? Math.round(
                        modules.reduce((sum, m) => sum + m.progress, 0) / modules.length
                      )
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Overall</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
