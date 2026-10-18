"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  MessageSquare,
  Plus,
  Search,
  Loader2,
  Users,
  User,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatRelativeTime, getRoleDisplayName } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MessageSearch } from "@/components/messages/message-search";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UserPreview {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  role: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: UserPreview;
}

interface Conversation {
  id: string;
  type: string;
  name: string | null;
  participants: UserPreview[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserPreview[]>([]);
  const [groupName, setGroupName] = useState("");

  // Use SWR for conversations with caching and auto-refresh
  const { data, error, isLoading: loading, mutate } = useSWR<{ conversations: Conversation[] }>(
    "/api/conversations",
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true, // Refresh when tab gains focus
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    }
  );

  const conversations = data?.conversations || [];

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search users");
      const data = await res.json();
      setSearchResults(data.users);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const toggleUserSelection = (user: UserPreview) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const startConversation = async (userId?: string) => {
    // If userId provided, it's a direct message to single user
    // If selectedUsers has entries, use those
    const participantIds = userId ? [userId] : selectedUsers.map(u => u.id);

    if (participantIds.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    const isGroup = participantIds.length > 1;

    if (isGroup && !groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds,
          type: isGroup ? "GROUP" : "DIRECT",
          name: isGroup ? groupName.trim() : undefined
        })
      });

      if (!res.ok) throw new Error("Failed to create conversation");

      const responseData = await res.json();
      // Revalidate conversations cache
      mutate();
      setNewChatOpen(false);
      setSearchQuery("");
      setSelectedUsers([]);
      setGroupName("");
      router.push(`/messages/${responseData.conversation.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setCreating(false);
    }
  };

  const getConversationName = (conv: Conversation): string => {
    if (conv.type === "GROUP" && conv.name) return conv.name;
    if (conv.participants.length === 0) return "Unknown";
    if (conv.participants.length === 1) {
      const p = conv.participants[0];
      return p.displayName || p.username;
    }
    return conv.participants.map(p => p.displayName || p.username).join(", ");
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === "GROUP") {
      return (
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
      );
    }

    const participant = conv.participants[0];
    if (!participant) {
      return (
        <Avatar className="h-12 w-12">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
      );
    }

    return (
      <Avatar className="h-12 w-12">
        {participant.avatarUrl && <AvatarImage src={participant.avatarUrl} />}
        <AvatarFallback className="bg-primary/10 text-primary">
          {getInitials(participant.displayName || participant.username)}
        </AvatarFallback>
      </Avatar>
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground mt-1">Your conversations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSearchOpen(true)}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button onClick={() => setNewChatOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <Card>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with someone
                </p>
                <Button onClick={() => setNewChatOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start a Conversation
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => router.push(`/messages/${conv.id}`)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    {getConversationAvatar(conv)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground"}`}>
                          {getConversationName(conv)}
                        </span>
                        {conv.participants[0] && conv.type === "DIRECT" && (
                          <Badge variant="outline" className="text-xs">
                            {getRoleDisplayName(conv.participants[0].role)}
                          </Badge>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {conv.lastMessage
                          ? formatRelativeTime(conv.lastMessage.createdAt)
                          : formatRelativeTime(conv.updatedAt)}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={(open) => {
        setNewChatOpen(open);
        if (!open) {
          setSelectedUsers([]);
          setGroupName("");
          setSearchQuery("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Select one person for direct message, or multiple people to create a group chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Selected ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-1 py-1 px-2"
                    >
                      <span>{user.displayName || user.username}</span>
                      <button
                        onClick={() => removeSelectedUser(user.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Group Name Input - Show when 2+ users selected */}
            {selectedUsers.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="Enter a name for your group..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-[250px] overflow-y-auto space-y-2">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const isSelected = selectedUsers.some(u => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      disabled={creating}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors disabled:opacity-50 ${
                        isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.displayName || user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{user.displayName || user.username}</p>
                        <p className="text-sm text-muted-foreground">{getRoleDisplayName(user.role)}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Start typing to search for users
                </div>
              )}
            </div>

            {/* Action Button */}
            {selectedUsers.length > 0 && (
              <Button
                onClick={() => startConversation()}
                disabled={creating || (selectedUsers.length > 1 && !groupName.trim())}
                className="w-full"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : selectedUsers.length > 1 ? (
                  <Users className="h-4 w-4 mr-2" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                {selectedUsers.length > 1
                  ? `Create Group Chat (${selectedUsers.length} members)`
                  : "Start Direct Message"
                }
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Search Dialog */}
      <MessageSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </DashboardLayout>
  );
}
