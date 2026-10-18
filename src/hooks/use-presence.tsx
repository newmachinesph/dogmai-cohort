"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PresenceStatus {
  status: string;
  lastSeenAt: string;
}

interface UsePresenceOptions {
  userIds: string[];
  enabled?: boolean;
  pollInterval?: number;
}

export function usePresence({ userIds, enabled = true, pollInterval = 30000 }: UsePresenceOptions) {
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  const [loading, setLoading] = useState(false);

  const fetchPresence = useCallback(async () => {
    if (!enabled || userIds.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/presence?userIds=${userIds.join(",")}`);
      if (!res.ok) return;

      const data = await res.json();
      setPresence(data.presence || {});
    } catch (error) {
      console.error("Error fetching presence:", error);
    } finally {
      setLoading(false);
    }
  }, [userIds, enabled]);

  useEffect(() => {
    fetchPresence();

    const interval = setInterval(fetchPresence, pollInterval);
    return () => clearInterval(interval);
  }, [fetchPresence, pollInterval]);

  const isOnline = useCallback((userId: string) => {
    return presence[userId]?.status === "ONLINE";
  }, [presence]);

  const getLastSeen = useCallback((userId: string) => {
    const lastSeen = presence[userId]?.lastSeenAt;
    if (!lastSeen) return null;
    return new Date(lastSeen);
  }, [presence]);

  return { presence, isOnline, getLastSeen, loading, refresh: fetchPresence };
}

// Hook to send heartbeat for current user's presence
export function usePresenceHeartbeat(enabled = true, interval = 30000) {
  const lastHeartbeatRef = useRef<number>(0);

  const sendHeartbeat = useCallback(async () => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastHeartbeatRef.current < interval / 2) return;
    lastHeartbeatRef.current = now;

    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ONLINE" })
      });
    } catch (error) {
      console.error("Error sending presence heartbeat:", error);
    }
  }, [enabled, interval]);

  useEffect(() => {
    if (!enabled) return;

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, interval);

    // Also send heartbeat on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, interval, sendHeartbeat]);

  return { sendHeartbeat };
}

// Format last seen time
export function formatLastSeen(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
