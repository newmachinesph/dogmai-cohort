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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Video,
  BookOpen,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

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
  createdAt: string;
  updatedAt: string;
  module: {
    id: string;
    title: string;
    slug: string;
    orderIndex: number;
    lessons: {
      id: string;
      title: string;
      slug: string;
      order: number;
    }[];
  };
}

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    difficulty: "BEGINNER",
    estimatedTime: "",
    videoUrl: "",
  });

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Lesson not found");
            router.push("/admin/curriculum");
            return;
          }
          throw new Error("Failed to fetch lesson");
        }
        const data = await res.json();
        setLesson(data.lesson);
        setEditForm({
          title: data.lesson.title,
          description: data.lesson.description || "",
          difficulty: data.lesson.difficulty,
          estimatedTime: data.lesson.estimatedTime?.toString() || "",
          videoUrl: data.lesson.videoUrl || "",
        });
      } catch (error) {
        console.error("Error fetching lesson:", error);
        toast.error("Failed to load lesson");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id, router]);

  const handleUpdate = async () => {
    if (!editForm.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          difficulty: editForm.difficulty,
          estimatedTime: editForm.estimatedTime ? parseInt(editForm.estimatedTime) : null,
          videoUrl: editForm.videoUrl || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update lesson");

      const data = await res.json();
      setLesson(prev => prev ? { ...prev, ...data.lesson } : null);
      toast.success("Lesson updated");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast.error("Failed to update lesson");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete lesson");
      }

      toast.success("Lesson deleted");
      router.push(lesson ? `/admin/curriculum/modules/${lesson.module.id}` : "/admin/curriculum");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete lesson");
    } finally {
      setProcessing(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!lesson) return;

    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !lesson.isPublished }),
      });

      if (!res.ok) throw new Error("Failed to update lesson");

      setLesson(prev => prev ? { ...prev, isPublished: !prev.isPublished } : null);
      toast.success(lesson.isPublished ? "Lesson unpublished" : "Lesson published");
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update lesson");
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

  if (!lesson) {
    return null;
  }

  // Find adjacent lessons
  const lessonIndex = lesson.module.lessons.findIndex(l => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? lesson.module.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lesson.module.lessons.length - 1 ? lesson.module.lessons[lessonIndex + 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/curriculum/modules/${lesson.module.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
              {lesson.isPublished ? (
                <Badge className="bg-emerald-500">Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {lesson.module.title} &bull; Lesson {lessonIndex + 1}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTogglePublish}>
            {lesson.isPublished ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lesson.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{lesson.description}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(lesson.difficulty)}>
                    {lesson.difficulty}
                  </Badge>
                </div>

                {lesson.estimatedTime && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{lesson.estimatedTime} minutes</span>
                  </div>
                )}

                {lesson.videoUrl && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Video className="h-4 w-4" />
                    <a
                      href={lesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Video Available
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{formatDate(lesson.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p>{formatDate(lesson.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              <CardDescription>
                {lesson.content.length} content blocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lesson.content.length > 0 ? (
                <div className="text-muted-foreground">
                  <p>Content editing is available in the full editor.</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No content added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lesson Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prevLesson && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/admin/curriculum/lessons/${prevLesson.id}`}>
                    &larr; {prevLesson.title}
                  </Link>
                </Button>
              )}
              {nextLesson && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/admin/curriculum/lessons/${nextLesson.id}`}>
                    {nextLesson.title} &rarr;
                  </Link>
                </Button>
              )}
              {!prevLesson && !nextLesson && (
                <p className="text-sm text-muted-foreground">This is the only lesson in the module.</p>
              )}
            </CardContent>
          </Card>

          {/* All Lessons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Module Lessons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lesson.module.lessons.map((l, index) => (
                <Link
                  key={l.id}
                  href={`/admin/curriculum/lessons/${l.id}`}
                  className={`block p-2 rounded-lg text-sm transition-colors ${
                    l.id === lesson.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  {index + 1}. {l.title}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update the lesson details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={editForm.difficulty}
                  onValueChange={(value) => setEditForm({ ...editForm, difficulty: value })}
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
              <div className="space-y-2">
                <Label htmlFor="edit-time">Est. Time (min)</Label>
                <Input
                  id="edit-time"
                  type="number"
                  min={1}
                  value={editForm.estimatedTime}
                  onChange={(e) => setEditForm({ ...editForm, estimatedTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-video">Video URL</Label>
              <Input
                id="edit-video"
                type="url"
                value={editForm.videoUrl}
                onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{lesson.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
