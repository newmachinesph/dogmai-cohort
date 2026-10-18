"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  UserPlus,
  UserMinus,
  Crown,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials, getRoleDisplayName } from "@/lib/utils";

interface UserPreview {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  role: string;
}

interface Participant {
  id: string;
  userId: string;
  role: string;
  user: UserPreview;
}

interface GroupChatManagerProps {
  conversationId: string;
  conversationName: string | null;
  participants: Participant[];
  currentUserId: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function GroupChatManager({
  conversationId,
  conversationName,
  participants,
  currentUserId,
  isAdmin,
  open,
  onOpenChange,
  onUpdate,
}: GroupChatManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversationName || "");
  const [savingName, setSavingName] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<Participant | null>(null);

  const participantIds = participants.map(p => p.userId);

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
      // Filter out existing participants
      setSearchResults(data.users.filter((u: UserPreview) => !participantIds.includes(u.id)));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  }, [participantIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleAddParticipant = async (userId: string) => {
    setAdding(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) throw new Error("Failed to add participant");

      toast.success("Participant added");
      setSearchQuery("");
      setSearchResults([]);
      onUpdate();
    } catch (error) {
      console.error("Error adding participant:", error);
      toast.error("Failed to add participant");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!userToRemove) return;

    setRemoving(userToRemove.userId);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userToRemove.userId })
      });

      if (!res.ok) throw new Error("Failed to remove participant");

      toast.success("Participant removed");
      onUpdate();
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Failed to remove participant");
    } finally {
      setRemoving(null);
      setRemoveDialogOpen(false);
      setUserToRemove(null);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === conversationName) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (!res.ok) throw new Error("Failed to update name");

      toast.success("Group name updated");
      setEditingName(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Failed to update group name");
    } finally {
      setSavingName(false);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "ADMIN" })
      });

      if (!res.ok) throw new Error("Failed to promote user");

      toast.success("User promoted to admin");
      onUpdate();
    } catch (error) {
      console.error("Error promoting user:", error);
      toast.error("Failed to promote user");
    }
  };

  const confirmRemove = (participant: Participant) => {
    setUserToRemove(participant);
    setRemoveDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Group</DialogTitle>
            <DialogDescription>
              Add or remove members from this group conversation.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Members ({participants.length})</TabsTrigger>
              {isAdmin && <TabsTrigger value="add">Add Members</TabsTrigger>}
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4">
              {/* Group Name */}
              {isAdmin && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  {editingName ? (
                    <>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Group name"
                        className="h-8"
                        disabled={savingName}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleUpdateName}
                        disabled={savingName}
                      >
                        {savingName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingName(false);
                          setNewName(conversationName || "");
                        }}
                        disabled={savingName}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {conversationName || "Unnamed Group"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingName(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Member List */}
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                  >
                    <Avatar className="h-10 w-10">
                      {participant.user.avatarUrl && (
                        <AvatarImage src={participant.user.avatarUrl} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(participant.user.displayName || participant.user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {participant.user.displayName || participant.user.username}
                        </p>
                        {participant.role === "ADMIN" && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {participant.userId === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getRoleDisplayName(participant.user.role)}
                      </p>
                    </div>
                    {isAdmin && participant.userId !== currentUserId && (
                      <div className="flex items-center gap-1">
                        {participant.role !== "ADMIN" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handlePromoteToAdmin(participant.userId)}
                            title="Make Admin"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => confirmRemove(participant)}
                          disabled={removing === participant.userId}
                        >
                          {removing === participant.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Add Members Tab */}
            {isAdmin && (
              <TabsContent value="add" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {searching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddParticipant(user.id)}
                        disabled={adding}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <Avatar className="h-10 w-10">
                          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(user.displayName || user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{user.displayName || user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {getRoleDisplayName(user.role)}
                          </p>
                        </div>
                        <UserPlus className="h-5 w-5 text-primary" />
                      </button>
                    ))
                  ) : searchQuery.trim() ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Search for users to add
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{userToRemove?.user.displayName || userToRemove?.user.username}</strong>{" "}
              from this group? They will no longer be able to see or send messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveParticipant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
