"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import {
  ArrowLeft,
  Search,
  Plus,
  MoreVertical,
  BookOpen,
  FileText,
  Loader2,
  Lock,
  Unlock,
  Calendar,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CohortModule {
  id: string;
  cohortId: string;
  moduleId: string;
  startDate: string | null;
  endDate: string | null;
  unlockedAt: string | null;
  isLocked: boolean;
  orderIndex: number;
  module: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    isPublished: boolean;
    _count: {
      lessons: number;
    };
  };
}

interface AvailableModule {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  _count: {
    lessons: number;
  };
}

// Sortable row component for drag and drop
function SortableModuleRow({
  cm,
  index,
  onToggleLock,
  onEditSchedule,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  cm: CohortModule;
  index: number;
  onToggleLock: (cm: CohortModule) => void;
  onEditSchedule: (cm: CohortModule) => void;
  onRemove: (cm: CohortModule) => void;
  onMoveUp: (cm: CohortModule) => void;
  onMoveDown: (cm: CohortModule) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cm.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b transition-colors hover:bg-muted/50 ${isDragging ? "bg-muted" : ""}`}
    >
      <td className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span>{index + 1}</span>
        </div>
      </td>
      <td className="p-4">
        <div>
          <Link
            href={`/admin/curriculum/modules/${cm.module.id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {cm.module.title}
          </Link>
          {cm.module.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {cm.module.description}
            </p>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{cm.module._count.lessons}</span>
        </div>
      </td>
      <td className="p-4">
        {cm.startDate || cm.endDate ? (
          <div className="text-sm">
            {cm.startDate && <p>{formatDate(cm.startDate)}</p>}
            {cm.endDate && (
              <p className="text-muted-foreground">to {formatDate(cm.endDate)}</p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not scheduled</span>
        )}
      </td>
      <td className="p-4">
        <Badge
          variant={cm.isLocked ? "secondary" : "default"}
          className="cursor-pointer"
          onClick={() => onToggleLock(cm)}
        >
          {cm.isLocked ? (
            <>
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="h-3 w-3 mr-1" />
              Unlocked
            </>
          )}
        </Badge>
      </td>
      <td className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/curriculum/modules/${cm.module.id}`}>
                View Module
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditSchedule(cm)}>
              <Calendar className="h-4 w-4 mr-2" />
              Edit Schedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleLock(cm)}>
              {cm.isLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Module
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Module
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isFirst && (
              <DropdownMenuItem onClick={() => onMoveUp(cm)}>
                <ArrowUp className="h-4 w-4 mr-2" />
                Move Up
              </DropdownMenuItem>
            )}
            {!isLast && (
              <DropdownMenuItem onClick={() => onMoveDown(cm)}>
                <ArrowDown className="h-4 w-4 mr-2" />
                Move Down
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onRemove(cm)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Cohort
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function CohortModulesPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [cohortModules, setCohortModules] = useState<CohortModule[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedCohortModule, setSelectedCohortModule] = useState<CohortModule | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    unlockedAt: "",
    isLocked: true,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [reordering, setReordering] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = useCallback(async () => {
    try {
      // Fetch cohort
      const cohortRes = await fetch(`/api/cohorts/${cohortId}`);
      if (!cohortRes.ok) throw new Error("Failed to fetch cohort");
      const cohortData = await cohortRes.json();
      setCohort(cohortData.cohort);

      // Fetch cohort modules
      const modulesRes = await fetch(`/api/cohort-modules?cohortId=${cohortId}`);
      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        setCohortModules(modulesData.cohortModules || []);
        setPagination((prev) => ({
          ...prev,
          total: modulesData.cohortModules?.length || 0,
          totalPages: Math.ceil((modulesData.cohortModules?.length || 0) / prev.limit),
        }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAvailableModules = async () => {
    try {
      const params = new URLSearchParams();
      params.set("published", "true");
      params.set("limit", "100");
      if (moduleSearchQuery) params.set("search", moduleSearchQuery);

      const res = await fetch(`/api/modules?${params}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already assigned modules
        const assignedModuleIds = cohortModules.map((cm) => cm.moduleId);
        const available = data.modules.filter(
          (m: AvailableModule) => !assignedModuleIds.includes(m.id)
        );
        setAvailableModules(available);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  useEffect(() => {
    if (addDialogOpen) {
      const timer = setTimeout(() => {
        fetchAvailableModules();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [addDialogOpen, moduleSearchQuery, cohortModules]);

  const handleAddModules = async () => {
    if (selectedModuleIds.length === 0) {
      toast.error("Select at least one module");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/cohort-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId,
          moduleIds: selectedModuleIds,
          isLocked: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add modules");
      }

      toast.success(`${selectedModuleIds.length} module(s) added`);
      setAddDialogOpen(false);
      setSelectedModuleIds([]);
      setModuleSearchQuery("");
      fetchData();
    } catch (error) {
      console.error("Error adding modules:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add modules");
    } finally {
      setProcessing(false);
    }
  };

  const handleEditModule = async () => {
    if (!selectedCohortModule) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/cohort-modules/${selectedCohortModule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
          unlockedAt: editForm.unlockedAt || null,
          isLocked: editForm.isLocked,
        }),
      });

      if (!res.ok) throw new Error("Failed to update module");

      toast.success("Module settings updated");
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating module:", error);
      toast.error("Failed to update module");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveModule = async () => {
    if (!selectedCohortModule) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/cohort-modules/${selectedCohortModule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove module");

      toast.success("Module removed from cohort");
      setRemoveDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error removing module:", error);
      toast.error("Failed to remove module");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleLock = async (cohortModule: CohortModule) => {
    try {
      const res = await fetch(`/api/cohort-modules/${cohortModule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !cohortModule.isLocked }),
      });

      if (!res.ok) throw new Error("Failed to toggle lock");
      toast.success(cohortModule.isLocked ? "Module unlocked" : "Module locked");
      fetchData();
    } catch (error) {
      console.error("Error toggling lock:", error);
      toast.error("Failed to update module");
    }
  };

  const openEditDialog = (cohortModule: CohortModule) => {
    setSelectedCohortModule(cohortModule);
    setEditForm({
      startDate: cohortModule.startDate ? cohortModule.startDate.split("T")[0] : "",
      endDate: cohortModule.endDate ? cohortModule.endDate.split("T")[0] : "",
      unlockedAt: cohortModule.unlockedAt ? cohortModule.unlockedAt.split("T")[0] : "",
      isLocked: cohortModule.isLocked,
    });
    setEditDialogOpen(true);
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Reorder modules via API
  const saveReorder = async (newOrder: CohortModule[]) => {
    setReordering(true);
    try {
      const res = await fetch("/api/cohort-modules/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId,
          moduleIds: newOrder.map((m) => m.id),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to reorder modules");
      }

      toast.success("Module order updated");
    } catch (error) {
      console.error("Error reordering modules:", error);
      toast.error("Failed to reorder modules");
      // Revert on error
      fetchData();
    } finally {
      setReordering(false);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cohortModules.findIndex((m) => m.id === active.id);
      const newIndex = cohortModules.findIndex((m) => m.id === over.id);

      const newOrder = arrayMove(cohortModules, oldIndex, newIndex);
      setCohortModules(newOrder);
      saveReorder(newOrder);
    }
  };

  // Move module up/down manually
  const handleMoveUp = (cm: CohortModule) => {
    const index = cohortModules.findIndex((m) => m.id === cm.id);
    if (index > 0) {
      const newOrder = arrayMove(cohortModules, index, index - 1);
      setCohortModules(newOrder);
      saveReorder(newOrder);
    }
  };

  const handleMoveDown = (cm: CohortModule) => {
    const index = cohortModules.findIndex((m) => m.id === cm.id);
    if (index < cohortModules.length - 1) {
      const newOrder = arrayMove(cohortModules, index, index + 1);
      setCohortModules(newOrder);
      saveReorder(newOrder);
    }
  };

  // Paginate cohort modules
  const paginatedModules = cohortModules.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

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
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.push(`/admin/cohorts/${cohortId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cohort
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Curriculum Modules</h1>
            <p className="text-muted-foreground mt-1">
              {cohort?.name} - {cohortModules.length} modules assigned
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Modules
          </Button>
        </div>
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
                <p className="text-2xl font-bold">{cohortModules.length}</p>
                <p className="text-sm text-muted-foreground">Total Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Unlock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {cohortModules.filter((m) => !m.isLocked).length}
                </p>
                <p className="text-sm text-muted-foreground">Unlocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {cohortModules.filter((m) => m.isLocked).length}
                </p>
                <p className="text-sm text-muted-foreground">Locked</p>
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
                <p className="text-2xl font-bold text-blue-600">
                  {cohortModules.reduce((sum, m) => sum + m.module._count.lessons, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assigned Modules</CardTitle>
          {reordering && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving order...
            </div>
          )}
        </CardHeader>
        <CardContent>
          {cohortModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No modules assigned to this cohort yet</p>
              <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                Add First Module
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Drag modules to reorder them, or use the menu to move up/down.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                        #
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Module
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Lessons
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Schedule
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12"></th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={cohortModules.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {cohortModules.map((cm, index) => (
                        <SortableModuleRow
                          key={cm.id}
                          cm={cm}
                          index={index}
                          onToggleLock={handleToggleLock}
                          onEditSchedule={openEditDialog}
                          onRemove={(cm) => {
                            setSelectedCohortModule(cm);
                            setRemoveDialogOpen(true);
                          }}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          isFirst={index === 0}
                          isLast={index === cohortModules.length - 1}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Modules Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Modules to Cohort</DialogTitle>
            <DialogDescription>
              Select modules to add to this cohort&apos;s curriculum
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-lg">
              {availableModules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {moduleSearchQuery ? "No modules found" : "All modules are already assigned"}
                </p>
              ) : (
                <div className="divide-y">
                  {availableModules.map((module) => (
                    <div
                      key={module.id}
                      className={`flex items-center gap-4 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedModuleIds.includes(module.id) ? "bg-primary/10" : ""
                      }`}
                      onClick={() => toggleModuleSelection(module.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModuleIds.includes(module.id)}
                        onChange={() => toggleModuleSelection(module.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{module.title}</p>
                        {module.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{module._count.lessons} lessons</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedModuleIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedModuleIds.length} module(s) selected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedModuleIds([]);
                setModuleSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddModules}
              disabled={selectedModuleIds.length === 0 || processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add {selectedModuleIds.length > 0 ? `${selectedModuleIds.length} ` : ""}Module(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module Schedule</DialogTitle>
            <DialogDescription>
              Configure when &quot;{selectedCohortModule?.module.title}&quot; is available
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlockedAt">Auto-unlock Date</Label>
              <Input
                id="unlockedAt"
                type="date"
                value={editForm.unlockedAt}
                onChange={(e) => setEditForm({ ...editForm, unlockedAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Module will automatically unlock on this date
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lock Status</Label>
                <p className="text-sm text-muted-foreground">
                  {editForm.isLocked
                    ? "Students cannot access this module"
                    : "Students can access this module"}
                </p>
              </div>
              <Switch
                checked={!editForm.isLocked}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isLocked: !checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditModule} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{selectedCohortModule?.module.title}&quot; from
              this cohort? Students will no longer have access to this module&apos;s content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveModule} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
