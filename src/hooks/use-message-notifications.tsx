"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface MessageNotification {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    displayName: string | null;
    username: string;
    avatarUrl: string | null;
  };
}

interface UseMessageNotificationsOptions {
  enabled?: boolean;
  pollInterval?: number; // in milliseconds
}

export function useMessageNotifications(options: UseMessageNotificationsOptions = {}) {
  const { enabled = true, pollInterval = 5000 } = options;
  const pathname = usePathname();
  const router = useRouter();
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const notifiedMessagesRef = useRef<Set<string>>(new Set());

  const checkNewMessages = useCallback(async () => {
    try {
      // Don't show notifications if already on messages page
      const isOnMessagesPage = pathname?.startsWith("/messages");

      const res = await fetch(
        `/api/messages/recent?after=${encodeURIComponent(lastCheckRef.current)}`
      );

      if (!res.ok) return;

      const data = await res.json();
      const newMessages: MessageNotification[] = data.messages || [];

      // Update last check time
      if (newMessages.length > 0) {
        lastCheckRef.current = newMessages[newMessages.length - 1].createdAt;
      }

      // Show toast for each new message (that we haven't already notified)
      for (const message of newMessages) {
        // Skip if already notified or if viewing that conversation
        if (notifiedMessagesRef.current.has(message.id)) continue;
        if (isOnMessagesPage && pathname === `/messages/${message.conversationId}`) continue;

        notifiedMessagesRef.current.add(message.id);

        // Limit stored message IDs to prevent memory issues
        if (notifiedMessagesRef.current.size > 100) {
          const iterator = notifiedMessagesRef.current.values();
          const firstValue = iterator.next().value;
          if (firstValue) notifiedMessagesRef.current.delete(firstValue);
        }

        const senderName = message.sender.displayName || message.sender.username;
        const truncatedContent = message.content.length > 50
          ? message.content.substring(0, 50) + "..."
          : message.content;

        toast(
          <div
            className="flex items-start gap-3 cursor-pointer w-full"
            onClick={() => {
              router.push(`/messages/${message.conversationId}`);
              toast.dismiss(message.id);
            }}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              {message.sender.avatarUrl && (
                <AvatarImage src={message.sender.avatarUrl} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{senderName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {truncatedContent}
              </p>
            </div>
          </div>,
          {
            id: message.id,
            duration: 5000,
            position: "top-right",
            className: "cursor-pointer",
          }
        );

        // Play notification sound (optional)
        try {
          const audio = new Audio("/notification.mp3");
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore if autoplay blocked
        } catch {
          // Ignore audio errors
        }
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkNewMessages();

    // Set up polling
    const interval = setInterval(checkNewMessages, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, checkNewMessages]);

  return { checkNewMessages };
}
