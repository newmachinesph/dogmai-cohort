"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { Plus, MoreVertical, BookOpen, FileText, Search, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Module {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
  isPublished: boolean;
  _count: {
    lessons: number;
    assignments: number;
  };
}

export default function CurriculumPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publishFilter, setPublishFilter] = useState<"all" | "published" | "draft">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [publishFilter]);

  // Build URL for SWR
  const buildUrl = () => {
    const params = new URLSearchParams();
    if (publishFilter === "published") params.set("published", "true");
    if (publishFilter === "draft") params.set("published", "false");
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());
    return `/api/modules?${params}`;
  };

  // Use SWR for caching
  const { data, isLoading: loading, mutate } = useSWR<{
    modules: Module[];
    pagination: { total: number; totalPages: number };
  }>(buildUrl(), fetcher, {
    dedupingInterval: 60000, // Cache for 1 minute
    revalidateOnFocus: false,
    onSuccess: (data) => {
      if (data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    },
  });

  const modules = data?.modules || [];

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
  };

  const handlePublishToggle = async (module: Module) => {
    try {
      const res = await fetch(`/api/modules/${module.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !module.isPublished }),
      });

      if (!res.ok) throw new Error("Failed to update module");
      toast.success(module.isPublished ? "Module unpublished" : "Module published");
      mutate();
    } catch (error) {
      console.error("Error updating module:", error);
      toast.error("Failed to update module");
    }
  };

  const handleDelete = async () => {
    if (!selectedModule) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/modules/${selectedModule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete module");
      }

      toast.success("Module deleted successfully");
      setDeleteDialogOpen(false);
      mutate();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete module");
    } finally {
      setProcessing(false);
    }
  };

  const totalLessons = modules.reduce((sum, m) => sum + m._count.lessons, 0);
  const publishedModules = modules.filter((m) => m.isPublished).length;

  // Only show loading spinner if no cached data
  if (loading && modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Curriculum</h1>
          <p className="text-muted-foreground mt-1">Manage modules and lessons</p>
        </div>
        <Button asChild>
          <Link href="/admin/curriculum/modules/new">
            <Plus className="w-4 h-4 mr-2" />
            New Module
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{modules.length}</p>
                <p className="text-sm text-muted-foreground">Total Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{publishedModules}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{modules.length - publishedModules}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
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
                <p className="text-2xl font-bold text-blue-600">{totalLessons}</p>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "published", "draft"] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={publishFilter === filter ? "default" : "outline"}
                  onClick={() => setPublishFilter(filter)}
                >
                  {filter === "all" ? "All" : filter === "published" ? "Published" : "Drafts"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No modules found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || publishFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first module to build your curriculum"}
              </p>
              {searchQuery || publishFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setPublishFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/admin/curriculum/modules/new">Create Module</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {modules.map((module, index) => (
              <Card key={module.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                      <span className="text-sm font-medium w-8">{(pagination.page - 1) * pagination.limit + index + 1}.</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/admin/curriculum/modules/${module.id}`}
                          className="font-semibold hover:text-primary transition-colors truncate"
                        >
                          {module.title}
                        </Link>
                        {module.isPublished ? (
                          <Badge>Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </div>
                      {module.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {module.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{module._count.lessons} lessons</span>
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
                          <Link href={`/admin/curriculum/modules/${module.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/curriculum/modules/${module.id}/edit`}>
                            Edit Module
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/curriculum/modules/${module.id}/lessons/new`}>
                            Add Lesson
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handlePublishToggle(module)}>
                          {module.isPublished ? "Unpublish" : "Publish"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedModule(module);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination.total > 0 && (
            <div className="mt-6">
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedModule?.title}&quot;? This will also
              delete all lessons in this module. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
