"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { Bell, Plus, Pin, PinOff, Loader2, Trash2, Archive, ArchiveRestore, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";

interface Cohort {
  id: string;
  name: string;
  status: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
  isArchived: boolean;
  publishedAt: string;
  cohort: { id: string; name: string };
  createdBy: { id: string; displayName: string | null; username: string };
  isRead: boolean;
  readCount: number;
}

export default function AdminAnnouncementsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("all");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [formData, setFormData] = useState({
    cohortId: "",
    title: "",
    content: "",
    priority: "NORMAL",
    isPinned: false,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await fetch("/api/cohorts?all=true");
        if (res.ok) {
          const data = await res.json();
          setCohorts(data.cohorts);
          if (data.cohorts.length > 0) {
            setFormData((prev) => ({ ...prev, cohortId: data.cohorts[0].id }));
          }
        }
      } catch (error) {
        console.error("Error fetching cohorts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCohorts();
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const archived = activeTab === "archived" ? "true" : "false";
      const params = new URLSearchParams();
      params.set("archived", archived);
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (selectedCohortId && selectedCohortId !== "all") {
        params.set("cohortId", selectedCohortId);
      }
      const res = await fetch(`/api/announcements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  }, [selectedCohortId, activeTab, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [selectedCohortId, activeTab]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
  };

  const handleCreate = async () => {
    if (!formData.cohortId || !formData.title || !formData.content) {
      toast.error("Cohort, title, and content are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          publishedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create announcement");

      setDialogOpen(false);
      setFormData((prev) => ({ ...prev, title: "", content: "", priority: "NORMAL", isPinned: false }));
      toast.success("Announcement posted");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;

    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !announcement.isPinned }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(announcement.isPinned ? "Unpinned" : "Pinned");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update announcement");
    }
  };

  const handleToggleArchive = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !announcement.isArchived }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(announcement.isArchived ? "Restored" : "Archived");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling archive:", error);
      toast.error("Failed to update announcement");
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "URGENT": return "destructive";
      case "HIGH": return "default";
      case "LOW": return "outline";
      default: return "secondary";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-emerald-500">Active</Badge>;
      case "UPCOMING": return <Badge variant="secondary">Upcoming</Badge>;
      case "COMPLETED": return <Badge variant="outline">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">Manage announcements across all cohorts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={cohorts.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {activeTab === "archived" ? "No archived announcements" : "No announcements yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className={announcement.isPinned ? "border-l-4 border-l-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {announcement.isPinned && <Pin className="w-4 h-4 text-primary" />}
                      <Badge variant={getPriorityVariant(announcement.priority)}>{announcement.priority}</Badge>
                      <Badge variant="outline">{announcement.cohort.name}</Badge>
                      <span className="text-sm text-muted-foreground">{formatRelativeTime(announcement.publishedAt)}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>{announcement.readCount} read</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTogglePin(announcement)}>
                          {announcement.isPinned ? (
                            <>
                              <PinOff className="w-4 h-4 mr-2" />
                              Unpin
                            </>
                          ) : (
                            <>
                              <Pin className="w-4 h-4 mr-2" />
                              Pin to top
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleArchive(announcement)}>
                          {announcement.isArchived ? (
                            <>
                              <ArchiveRestore className="w-4 h-4 mr-2" />
                              Restore
                            </>
                          ) : (
                            <>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(announcement.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="mt-2">{announcement.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{announcement.content}</p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Posted by <span className="font-medium">{announcement.createdBy.displayName || announcement.createdBy.username}</span>
                  </p>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>Post an announcement to a cohort</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cohort</label>
              <Select value={formData.cohortId} onValueChange={(v) => setFormData({ ...formData, cohortId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      <div className="flex items-center gap-2">
                        {cohort.name}
                        {getStatusBadge(cohort.status)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your announcement..."
                rows={4}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Pin announcement</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
