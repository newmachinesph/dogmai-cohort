"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  BookOpen,
  FileText,
  Clock,
  Loader2,
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Video,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

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
  _count: {
    lessonProgress: number;
  };
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  isPublished: boolean;
}

interface CohortModule {
  cohort: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Module {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
  assignments: Assignment[];
  cohortModules: CohortModule[];
  _count: {
    lessons: number;
    assignments: number;
  };
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [deleteLessonDialogOpen, setDeleteLessonDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
  });

  // New lesson form
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    difficulty: "BEGINNER",
    estimatedTime: "",
    videoUrl: "",
  });

  const fetchModule = useCallback(async () => {
    try {
      const res = await fetch(`/api/modules/${moduleId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Module not found");
          router.push("/admin/curriculum");
          return;
        }
        throw new Error("Failed to fetch module");
      }
      const data = await res.json();
      setModule(data.module);
      setEditForm({
        title: data.module.title,
        description: data.module.description || "",
      });
    } catch (error) {
      console.error("Error fetching module:", error);
      toast.error("Failed to load module");
    } finally {
      setLoading(false);
    }
  }, [moduleId, router]);

  useEffect(() => {
    fetchModule();
  }, [fetchModule]);

  const handleUpdate = async () => {
    if (!editForm.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update module");

      toast.success("Module updated");
      setEditDialogOpen(false);
      fetchModule();
    } catch (error) {
      console.error("Error updating module:", error);
      toast.error("Failed to update module");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete module");
      }

      toast.success("Module deleted");
      router.push("/admin/curriculum");
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete module");
    } finally {
      setProcessing(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!module) return;

    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !module.isPublished }),
      });

      if (!res.ok) throw new Error("Failed to update module");

      toast.success(module.isPublished ? "Module unpublished" : "Module published");
      fetchModule();
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update module");
    }
  };

  const handleCreateLesson = async () => {
    if (!lessonForm.title.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          title: lessonForm.title,
          description: lessonForm.description || null,
          difficulty: lessonForm.difficulty,
          estimatedTime: lessonForm.estimatedTime ? parseInt(lessonForm.estimatedTime) : null,
          videoUrl: lessonForm.videoUrl || null,
          isPublished: false,
        }),
      });

      if (!res.ok) throw new Error("Failed to create lesson");

      toast.success("Lesson created");
      setLessonDialogOpen(false);
      setLessonForm({
        title: "",
        description: "",
        difficulty: "BEGINNER",
        estimatedTime: "",
        videoUrl: "",
      });
      fetchModule();
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleLessonPublish = async (lesson: Lesson) => {
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !lesson.isPublished }),
      });

      if (!res.ok) throw new Error("Failed to update lesson");

      toast.success(lesson.isPublished ? "Lesson unpublished" : "Lesson published");
      fetchModule();
    } catch (error) {
      console.error("Error toggling lesson publish:", error);
      toast.error("Failed to update lesson");
    }
  };

  const handleDeleteLesson = async () => {
    if (!selectedLesson) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/lessons/${selectedLesson.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete lesson");

      toast.success("Lesson deleted");
      setDeleteLessonDialogOpen(false);
      setSelectedLesson(null);
      fetchModule();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    } finally {
      setProcessing(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!module) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/curriculum">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{module.title}</h1>
              {module.isPublished ? (
                <Badge>Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {module.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleTogglePublish}>
            {module.isPublished ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
          <Button onClick={() => setLessonDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{module._count.lessons}</p>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{module._count.assignments}</p>
                <p className="text-sm text-muted-foreground">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{module.cohortModules.length}</p>
                <p className="text-sm text-muted-foreground">Cohorts</p>
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
                <p className="text-2xl font-bold text-amber-600">
                  {module.lessons.reduce((sum, l) => sum + (l.estimatedTime || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lessons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lessons</CardTitle>
          <Button size="sm" onClick={() => setLessonDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </CardHeader>
        <CardContent>
          {module.lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No lessons yet</h3>
              <p className="text-muted-foreground mb-4">Add lessons to build your module content</p>
              <Button onClick={() => setLessonDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Lesson
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {module.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                    <span className="text-sm font-medium w-6">{index + 1}.</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{lesson.title}</span>
                      {lesson.isPublished ? (
                        <Badge variant="outline" className="text-emerald-600">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                      <Badge className={getDifficultyColor(lesson.difficulty)}>
                        {lesson.difficulty}
                      </Badge>
                      {lesson.videoUrl && (
                        <Video className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {lesson.estimatedTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{lesson.estimatedTime} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{lesson._count.lessonProgress}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/curriculum/lessons/${lesson.id}`}>
                          View / Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleLessonPublish(lesson)}>
                        {lesson.isPublished ? "Unpublish" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setDeleteLessonDialogOpen(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments */}
      {module.assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {module.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(assignment.dueDate)}
                      </p>
                    </div>
                  </div>
                  {assignment.isPublished ? (
                    <Badge>Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cohorts using this module */}
      {module.cohortModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Used in Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {module.cohortModules.map((cm) => (
                <Link key={cm.cohort.id} href={`/admin/cohorts/${cm.cohort.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    {cm.cohort.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Info */}
      <Card>
        <CardHeader>
          <CardTitle>Module Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-mono text-sm">{module.slug}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Index</p>
              <p className="font-medium">{module.orderIndex}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(module.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{formatDate(module.updatedAt)}</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={module._count.lessons > 0 || module._count.assignments > 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Module
            </Button>
            {(module._count.lessons > 0 || module._count.assignments > 0) && (
              <p className="text-sm text-muted-foreground mt-2">
                Delete all lessons and assignments before deleting this module.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>Update module information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Module title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Module description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{module.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>Create a new lesson for this module</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Brief description of the lesson"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Difficulty</label>
                <Select
                  value={lessonForm.difficulty}
                  onValueChange={(v) => setLessonForm({ ...lessonForm, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  value={lessonForm.estimatedTime}
                  onChange={(e) => setLessonForm({ ...lessonForm, estimatedTime: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Video URL (optional)</label>
              <Input
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleCreateLesson} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Dialog */}
      <Dialog open={deleteLessonDialogOpen} onOpenChange={setDeleteLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedLesson?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteLessonDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLesson} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
