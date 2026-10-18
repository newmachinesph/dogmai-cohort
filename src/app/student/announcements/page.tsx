"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { Pin, Bell, Loader2, Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
  publishedAt: string;
  isRead: boolean;
  createdBy: {
    id: string;
    displayName: string | null;
    username: string;
    avatarUrl: string | null;
  };
  cohort: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleMarkAsRead = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: announcement.isRead ? "markUnread" : "markRead" }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setAnnouncements(
        announcements.map((a) =>
          a.id === announcement.id ? { ...a, isRead: !a.isRead } : a
        )
      );
    } catch (error) {
      console.error("Error updating read status:", error);
      toast.error("Failed to update");
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadAnnouncements = announcements.filter((a) => !a.isRead);

    try {
      await Promise.all(
        unreadAnnouncements.map((a) =>
          fetch(`/api/announcements/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "markRead" }),
          })
        )
      );

      setAnnouncements(announcements.map((a) => ({ ...a, isRead: true })));
      toast.success("All marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const pinnedAnnouncements = announcements.filter((a) => a.isPinned);
  const regularAnnouncements = announcements.filter((a) => !a.isPinned);
  const unreadCount = announcements.filter((a) => !a.isRead).length;

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "destructive";
      case "HIGH":
        return "default";
      case "LOW":
        return "outline";
      default:
        return "secondary";
    }
  };

  const AnnouncementCard = ({ announcement, isPinned }: { announcement: Announcement; isPinned?: boolean }) => (
    <Card
      key={announcement.id}
      className={cn(
        isPinned && "border-l-4 border-l-primary",
        !announcement.isRead && "bg-primary/5"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {!announcement.isRead && (
              <Circle className="w-2 h-2 fill-primary text-primary" />
            )}
            <Badge variant={getPriorityVariant(announcement.priority)}>
              {announcement.priority}
            </Badge>
            <Badge variant="outline">{announcement.cohort.name}</Badge>
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(announcement.publishedAt)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMarkAsRead(announcement)}
            className="text-muted-foreground hover:text-foreground"
          >
            {announcement.isRead ? (
              <>
                <Circle className="w-4 h-4 mr-1" />
                Mark unread
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Mark read
              </>
            )}
          </Button>
        </div>
        <CardTitle className="mt-2">{announcement.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-line">{announcement.content}</p>
        <p className="text-sm text-muted-foreground mt-4">
          Posted by{" "}
          <span className="font-medium">
            {announcement.createdBy.displayName || announcement.createdBy.username}
          </span>
        </p>
      </CardContent>
    </Card>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with cohort news
            {unreadCount > 0 && (
              <span className="ml-2 text-primary font-medium">({unreadCount} unread)</span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary" />
            Pinned
          </h2>
          {pinnedAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} isPinned />
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No announcements</h3>
              <p className="text-muted-foreground">There are no announcements at this time</p>
            </div>
          </CardContent>
        </Card>
      ) : regularAnnouncements.length === 0 && pinnedAnnouncements.length > 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          No other announcements
        </div>
      ) : (
        <div className="space-y-4">
          {pinnedAnnouncements.length > 0 && (
            <h2 className="text-lg font-semibold">Recent</h2>
          )}
          {regularAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
}
