"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Megaphone,
  Award,
  ClipboardCheck,
  UserPlus,
  FileCheck,
  Activity,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  actor?: string;
  avatarUrl?: string;
  cohortName?: string;
  createdAt: string;
  dueDate?: string;
  link?: string;
}

interface ActivityFeedProps {
  limit?: number;
  cohortId?: string;
  showHeader?: boolean;
  className?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "ANNOUNCEMENT":
      return <Megaphone className="h-4 w-4" />;
    case "GRADE_RECEIVED":
    case "SUBMISSION_GRADED":
      return <Award className="h-4 w-4" />;
    case "NEW_ASSIGNMENT":
      return <ClipboardCheck className="h-4 w-4" />;
    case "NEW_SUBMISSION":
      return <FileCheck className="h-4 w-4" />;
    case "NEW_ENROLLMENT":
      return <UserPlus className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "ANNOUNCEMENT":
      return "bg-blue-500/10 text-blue-500";
    case "GRADE_RECEIVED":
    case "SUBMISSION_GRADED":
      return "bg-green-500/10 text-green-500";
    case "NEW_ASSIGNMENT":
      return "bg-orange-500/10 text-orange-500";
    case "NEW_SUBMISSION":
      return "bg-purple-500/10 text-purple-500";
    case "NEW_ENROLLMENT":
      return "bg-cyan-500/10 text-cyan-500";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ActivityFeed({
  limit = 10,
  cohortId,
  showHeader = true,
  className = "",
}: ActivityFeedProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async () => {
    try {
      const cohortParam = cohortId ? `&cohortId=${cohortId}` : "";
      const res = await fetch(`/api/activity?limit=${limit}${cohortParam}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchActivities, 120000);
    return () => clearInterval(interval);
  }, [cohortId, limit]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>Recent activity across your cohorts</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 group cursor-pointer"
                onClick={() => activity.link && router.push(activity.link)}
              >
                {activity.avatarUrl ? (
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activity.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(activity.actor || "")}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${getActivityColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {activity.title}
                    </p>
                    {activity.link && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                    {activity.cohortName && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {activity.cohortName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
