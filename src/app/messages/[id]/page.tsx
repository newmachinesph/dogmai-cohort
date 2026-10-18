"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  MoreVertical,
  Trash2,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Download,
  Play,
  Reply,
  Smile,
  File,
  Settings,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { getInitials, formatRelativeTime, getRoleDisplayName, formatFileSize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useUploadThing } from "@/lib/uploadthing-client";
import { GroupChatManager } from "@/components/messages/group-chat-manager";
import { FormattedMessage } from "@/components/messages/formatted-message";
import { usePresence, usePresenceHeartbeat, formatLastSeen } from "@/hooks/use-presence";

interface UserPreview {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  role?: string;
}

interface Participant {
  id: string;
  userId: string;
  role?: string;
  lastReadAt: string | null;
  isTyping?: boolean;
  typingAt?: string;
  user: UserPreview;
}

interface MessageReaction {
  id: string;
  emoji: string;
  user: UserPreview;
}

interface ReplyMessage {
  id: string;
  content: string;
  sender: UserPreview;
}

interface Message {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
  sender: UserPreview;
  replyTo: ReplyMessage | null;
  reactions: MessageReaction[];
}

interface Conversation {
  id: string;
  type: string;
  name: string | null;
  participants: Participant[];
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    url: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Get other participant IDs for presence tracking (memoized to prevent polling loop)
  const otherParticipantIds = useMemo(() =>
    conversation?.participants
      .filter(p => p.userId !== user?.id)
      .map(p => p.userId) || [],
    [conversation?.participants, user?.id]
  );

  // Track presence for other participants
  const { isOnline, getLastSeen } = usePresence({
    userIds: otherParticipantIds,
    enabled: conversation?.type === "DIRECT",
    pollInterval: 15000
  });

  // Send heartbeat for current user
  usePresenceHeartbeat(!!user);

  const { startUpload, isUploading } = useUploadThing("messageAttachment", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        setPendingFile({
          url: res[0].ufsUrl,
          name: res[0].name,
          size: res[0].size,
          type: res[0].type,
        });
        setUploadingFile(false);
      }
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setUploadingFile(false);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Conversation not found");
          router.push("/messages");
          return;
        }
        throw new Error("Failed to fetch conversation");
      }
      const data = await res.json();
      setConversation(data.conversation);
      setMessages(data.messages);

      if (data.messages.length > 0) {
        lastMessageTimeRef.current = data.messages[data.messages.length - 1].createdAt;
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId, router]);

  const pollNewMessages = useCallback(async () => {
    if (!lastMessageTimeRef.current) return;

    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?after=${encodeURIComponent(lastMessageTimeRef.current)}`
      );
      if (!res.ok) return;

      const data = await res.json();
      if (data.messages.length > 0) {
        setMessages(prev => [...prev, ...data.messages]);
        lastMessageTimeRef.current = data.messages[data.messages.length - 1].createdAt;
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error polling messages:", error);
    }
  }, [conversationId, scrollToBottom]);

  const pollTypingStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/typing`);
      if (!res.ok) return;

      const data = await res.json();
      const typingArray = data.typingUsers || [];
      const otherTyping = typingArray
        .filter((t: { id: string }) => t.id !== user?.id)
        .map((t: { displayName: string; username: string }) => t.displayName || t.username);
      setTypingUsers(otherTyping);
    } catch (error) {
      console.error("Error polling typing:", error);
    }
  }, [conversationId, user?.id]);

  const sendTypingIndicator = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingRef.current < 3000) return;
    lastTypingRef.current = now;

    try {
      await fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: true })
      });
    } catch (error) {
      console.error("Error sending typing:", error);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    const messageInterval = setInterval(pollNewMessages, 3000);
    const typingInterval = setInterval(pollTypingStatus, 2000);
    return () => {
      clearInterval(messageInterval);
      clearInterval(typingInterval);
    };
  }, [pollNewMessages, pollTypingStatus]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, scrollToBottom, messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    sendTypingIndicator();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: false })
      }).catch(() => {});
    }, 5000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      await startUpload([file]);
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Failed to upload file");
      setUploadingFile(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = newMessage.trim().length > 0;
    const hasFile = pendingFile !== null;

    if ((!hasContent && !hasFile) || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageContent || "",
          replyToId: replyingTo?.id,
          fileUrl: pendingFile?.url,
          fileName: pendingFile?.name,
          fileSize: pendingFile?.size,
          fileMimeType: pendingFile?.type,
        })
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      lastMessageTimeRef.current = data.message.createdAt;
      setReplyingTo(null);
      setPendingFile(null);
      scrollToBottom();
      inputRef.current?.focus();

      // Clear typing indicator
      fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: false })
      }).catch(() => {});
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji })
      });

      if (!res.ok) throw new Error("Failed to react");

      const data = await res.json();

      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          if (data.removed) {
            return {
              ...m,
              reactions: m.reactions.filter(r => !(r.emoji === emoji && r.user.id === user?.id))
            };
          } else if (data.reaction) {
            return {
              ...m,
              reactions: [...m.reactions, data.reaction]
            };
          }
        }
        return m;
      }));
    } catch (error) {
      console.error("Error reacting:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete conversation");

      toast.success("Conversation deleted");
      router.push("/messages");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getOtherParticipants = () => {
    if (!conversation) return [];
    return conversation.participants
      .filter(p => p.userId !== user?.id)
      .map(p => p.user);
  };

  const getConversationTitle = () => {
    if (!conversation) return "Loading...";
    if (conversation.type === "GROUP" && conversation.name) return conversation.name;
    const others = getOtherParticipants();
    if (others.length === 0) return "Unknown";
    if (others.length === 1) return others[0].displayName || others[0].username;
    return others.map(p => p.displayName || p.username).join(", ");
  };

  const getConversationAvatar = () => {
    if (!conversation) return null;

    if (conversation.type === "GROUP") {
      return (
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
      );
    }

    const other = getOtherParticipants()[0];
    if (!other) return null;

    return (
      <Avatar className="h-10 w-10">
        {other.avatarUrl && <AvatarImage src={other.avatarUrl} />}
        <AvatarFallback className="bg-primary/10 text-primary">
          {getInitials(other.displayName || other.username)}
        </AvatarFallback>
      </Avatar>
    );
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  };

  const renderFilePreview = (message: Message, isOwn: boolean) => {
    if (!message.fileUrl) return null;

    const isImage = message.contentType === "IMAGE" || message.fileMimeType?.startsWith("image/");
    const isVideo = message.contentType === "VIDEO" || message.fileMimeType?.startsWith("video/");
    const isAudio = message.contentType === "AUDIO" || message.fileMimeType?.startsWith("audio/");

    if (isImage) {
      return (
        <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Image
            src={message.fileUrl}
            alt={message.fileName || "Image"}
            width={300}
            height={200}
            className="rounded-lg max-w-full h-auto object-cover"
            unoptimized
          />
        </a>
      );
    }

    if (isVideo) {
      return (
        <video
          src={message.fileUrl}
          controls
          className="rounded-lg max-w-full"
          style={{ maxHeight: "300px" }}
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    if (isAudio) {
      return (
        <audio src={message.fileUrl} controls className="w-full">
          Your browser does not support the audio tag.
        </audio>
      );
    }

    // Generic file
    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 p-3 rounded-lg ${
          isOwn ? "bg-primary-foreground/10" : "bg-background"
        }`}
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{message.fileName}</p>
          {message.fileSize && (
            <p className={`text-xs ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {formatFileSize(message.fileSize)}
            </p>
          )}
        </div>
        <Download className="h-5 w-5 flex-shrink-0" />
      </a>
    );
  };

  const renderReactions = (message: Message) => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const groupedReactions = message.reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = [];
      }
      acc[r.emoji].push(r.user);
      return acc;
    }, {} as Record<string, UserPreview[]>);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(groupedReactions).map(([emoji, users]) => (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleReaction(message.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    users.some(u => u.id === user?.id)
                      ? "bg-primary/20 border border-primary"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {users.map(u => u.displayName || u.username).join(", ")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        {/* Header */}
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/messages">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="relative">
                {getConversationAvatar()}
                {conversation?.type === "DIRECT" && otherParticipantIds[0] && isOnline(otherParticipantIds[0]) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div>
                <h2 className="font-semibold">{getConversationTitle()}</h2>
                {conversation?.type === "DIRECT" && getOtherParticipants()[0] && (
                  <p className="text-sm text-muted-foreground">
                    {otherParticipantIds[0] && isOnline(otherParticipantIds[0])
                      ? "Online"
                      : otherParticipantIds[0] && getLastSeen(otherParticipantIds[0])
                        ? `Last seen ${formatLastSeen(getLastSeen(otherParticipantIds[0])!)}`
                        : getOtherParticipants()[0].role
                          ? getRoleDisplayName(getOtherParticipants()[0].role!)
                          : "Offline"}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation?.type === "GROUP" && (
                  <DropdownMenuItem onClick={() => setGroupManagerOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {conversation?.type === "GROUP" ? "Leave Group" : "Delete Conversation"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender.id === user?.id;
              const showAvatar = index === 0 || messages[index - 1].sender.id !== message.sender.id;
              const showTime = index === messages.length - 1 ||
                messages[index + 1].sender.id !== message.sender.id ||
                new Date(messages[index + 1].createdAt).getTime() - new Date(message.createdAt).getTime() > 5 * 60 * 1000;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {!isOwn && showAvatar ? (
                    <Avatar className="h-8 w-8 mt-1">
                      {message.sender.avatarUrl && <AvatarImage src={message.sender.avatarUrl} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(message.sender.displayName || message.sender.username)}
                      </AvatarFallback>
                    </Avatar>
                  ) : !isOwn ? (
                    <div className="w-8" />
                  ) : null}
                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                    {!isOwn && showAvatar && (
                      <span className="text-xs text-muted-foreground mb-1">
                        {message.sender.displayName || message.sender.username}
                      </span>
                    )}

                    {/* Reply Preview */}
                    {message.replyTo && (
                      <div className={`text-xs px-3 py-1.5 rounded-t-lg border-l-2 border-primary/50 mb-0.5 ${
                        isOwn ? "bg-primary/5 text-right" : "bg-muted/50"
                      }`}>
                        <span className="font-medium">{message.replyTo.sender.displayName || message.replyTo.sender.username}</span>
                        <p className="truncate opacity-70">{message.replyTo.content || "[File]"}</p>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="relative">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        }`}
                      >
                        {renderFilePreview(message, isOwn)}
                        {message.content && (
                          <div className={message.fileUrl ? "mt-2" : ""}>
                            <FormattedMessage content={message.content} />
                          </div>
                        )}
                      </div>

                      {/* Action buttons - shown on hover */}
                      <div className={`absolute top-0 ${isOwn ? "-left-20" : "-right-20"} hidden group-hover:flex items-center gap-1`}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Smile className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align={isOwn ? "end" : "start"}>
                            <div className="flex gap-1">
                              {EMOJI_OPTIONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className="hover:bg-muted p-1.5 rounded text-lg"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setReplyingTo(message)}
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Reactions */}
                    {renderReactions(message)}

                    {showTime && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatMessageDate(message.createdAt)}
                        {message.isEdited && " (edited)"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.join(", ")} are typing...`}
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className="border-t px-4 py-2 flex items-center gap-3 bg-muted/50">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{replyingTo.sender.displayName || replyingTo.sender.username}</p>
              <p className="text-sm text-muted-foreground truncate">{replyingTo.content || "[File]"}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Pending File Preview */}
        {pendingFile && (
          <div className="border-t px-4 py-2 flex items-center gap-3 bg-muted/50">
            {pendingFile.type.startsWith("image/") ? (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <File className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(pendingFile.size)}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingFile}
            >
              {uploadingFile ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
              maxLength={5000}
            />
            <Button type="submit" disabled={sending || (!newMessage.trim() && !pendingFile)}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {conversation?.type === "GROUP" ? "Leave Group" : "Delete Conversation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {conversation?.type === "GROUP"
                ? "Are you sure you want to leave this group? You will no longer be able to see or send messages."
                : "Are you sure you want to delete this conversation? This will remove all messages and cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {conversation?.type === "GROUP" ? "Leave" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Chat Manager */}
      {conversation?.type === "GROUP" && (
        <GroupChatManager
          conversationId={conversationId}
          conversationName={conversation.name}
          participants={conversation.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            role: p.role || "MEMBER",
            user: {
              ...p.user,
              role: p.user.role || "STUDENT"
            }
          }))}
          currentUserId={user?.id || ""}
          isAdmin={conversation.participants.some(p => p.userId === user?.id && p.role === "ADMIN")}
          open={groupManagerOpen}
          onOpenChange={setGroupManagerOpen}
          onUpdate={fetchConversation}
        />
      )}
    </DashboardLayout>
  );
}
