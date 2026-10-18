"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Plus, MapPin, Video, Users } from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatDate } from "@/lib/utils";

interface Cohort {
  id: string;
  name: string;
  status: string;
  location: string;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  location: string | null;
  status: string;
  cohort: { id: string; name: string };
  _count?: { attendance: number };
}

interface Student {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Enrollment {
  id: string;
  userId: string;
  status: string;
  user: Student;
}

interface AttendanceRecord {
  userId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  notes?: string;
  checkInAt?: string;
  checkOutAt?: string;
}

export default function AttendancePage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [existingAttendance, setExistingAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    mode: "HYBRID",
    location: "",
  });

  const lastFetchRef = useRef<string>("");
  const [noCohortMessage, setNoCohortMessage] = useState<string | null>(null);

  // Fetch staff's cohorts on mount
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await fetch("/api/cohorts");
        if (!res.ok) throw new Error("Failed to fetch cohorts");
        const data = await res.json();
        if (data.message) {
          setNoCohortMessage(data.message);
        }
        // Show ACTIVE and UPCOMING cohorts for attendance management
        const availableCohorts = data.cohorts.filter(
          (c: Cohort) => c.status === "ACTIVE" || c.status === "UPCOMING"
        );
        setCohorts(availableCohorts);
        if (availableCohorts.length > 0) {
          // Prefer active cohort if available
          const activeCohort = availableCohorts.find((c: Cohort) => c.status === "ACTIVE");
          setSelectedCohortId(activeCohort?.id || availableCohorts[0].id);
        }
      } catch (error) {
        console.error("Error fetching cohorts:", error);
        toast.error("Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    };

    fetchCohorts();
  }, []);

  // Fetch sessions when cohort changes
  useEffect(() => {
    if (!selectedCohortId) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch(`/api/sessions?cohortId=${selectedCohortId}`);
        if (!res.ok) throw new Error("Failed to fetch sessions");
        const data = await res.json();
        setSessions(data.sessions);
        // Select the most recent upcoming or today's session
        const today = new Date().toISOString().split("T")[0];
        const todaySession = data.sessions.find((s: Session) => s.date.split("T")[0] === today);
        if (todaySession) {
          setSelectedSessionId(todaySession.id);
        } else if (data.sessions.length > 0) {
          setSelectedSessionId(data.sessions[0].id);
        } else {
          setSelectedSessionId("");
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to load sessions");
      }
    };

    fetchSessions();
  }, [selectedCohortId]);

  // Fetch enrollments and attendance when session changes
  useEffect(() => {
    if (!selectedCohortId || !selectedSessionId) return;

    const fetchKey = `${selectedCohortId}-${selectedSessionId}`;
    if (lastFetchRef.current === fetchKey) return;
    lastFetchRef.current = fetchKey;

    const fetchData = async () => {
      setLoadingAttendance(true);

      try {
        // Fetch enrollments
        const enrollRes = await fetch(`/api/enrollments?cohortId=${selectedCohortId}&status=ACTIVE`);
        if (!enrollRes.ok) throw new Error("Failed to fetch enrollments");
        const enrollData = await enrollRes.json();
        setEnrollments(enrollData.enrollments);

        // Initialize attendance with all students as PRESENT
        const initial: Record<string, AttendanceRecord> = {};
        enrollData.enrollments.forEach((e: Enrollment) => {
          initial[e.userId] = { userId: e.userId, status: "PRESENT" };
        });

        // Fetch existing attendance for this session
        const attendRes = await fetch(`/api/attendance?sessionId=${selectedSessionId}`);
        if (attendRes.ok) {
          const attendData = await attendRes.json();
          const existing: Record<string, string> = {};

          attendData.attendance.forEach((a: { userId: string; status: string; notes?: string; checkInAt?: string; checkOutAt?: string }) => {
            existing[a.userId] = a.status;
            initial[a.userId] = {
              userId: a.userId,
              status: a.status as AttendanceRecord["status"],
              notes: a.notes,
              checkInAt: a.checkInAt,
              checkOutAt: a.checkOutAt,
            };
          });

          setExistingAttendance(existing);
        }

        setAttendance(initial);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load attendance data");
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchData();
  }, [selectedCohortId, selectedSessionId]);

  // Auto-save individual student attendance
  const handleStatusChange = async (userId: string, status: AttendanceRecord["status"]) => {
    if (!selectedSessionId) {
      toast.error("Please select a session first");
      return;
    }

    // Don't save if already this status
    if (attendance[userId]?.status === status) return;

    setSavingUserId(userId);

    // Optimistically update UI
    setAttendance((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], userId, status },
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          records: [{ userId, status }],
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Update existing attendance tracking
      setExistingAttendance((prev) => ({ ...prev, [userId]: status }));
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
      // Revert on error
      setAttendance((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], status: existingAttendance[userId] as AttendanceRecord["status"] || "PRESENT" },
      }));
    } finally {
      setSavingUserId(null);
    }
  };

  // Mark all students with a status and save
  const handleMarkAll = async (status: AttendanceRecord["status"]) => {
    if (!selectedSessionId) {
      toast.error("Please select a session first");
      return;
    }

    setSavingUserId("all");

    // Optimistically update UI
    const updated: Record<string, AttendanceRecord> = {};
    enrollments.forEach((e) => {
      updated[e.userId] = { userId: e.userId, status };
    });
    setAttendance(updated);

    try {
      const records = enrollments.map((e) => ({ userId: e.userId, status }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          records,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(`All students marked as ${status.toLowerCase()}`);

      // Update existing attendance tracking
      const newExisting: Record<string, string> = {};
      enrollments.forEach((e) => {
        newExisting[e.userId] = status;
      });
      setExistingAttendance(newExisting);
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.date) {
      toast.error("Title and date are required");
      return;
    }

    setCreatingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: selectedCohortId,
          ...newSession,
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const data = await res.json();
      setSessions((prev) => [data.session, ...prev]);
      setSelectedSessionId(data.session.id);
      setCreateDialogOpen(false);
      setNewSession({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "",
      });
      toast.success("Session created successfully");
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "ABSENT":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "LATE":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "EXCUSED":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "default";
      case "ABSENT":
        return "destructive";
      case "LATE":
        return "secondary";
      case "EXCUSED":
        return "outline";
      default:
        return "outline";
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ONLINE":
        return <Video className="h-4 w-4" />;
      case "ONSITE":
        return <MapPin className="h-4 w-4" />;
      case "HYBRID":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Calculate summary
  const summary = {
    present: Object.values(attendance).filter((a) => a.status === "PRESENT").length,
    absent: Object.values(attendance).filter((a) => a.status === "ABSENT").length,
    late: Object.values(attendance).filter((a) => a.status === "LATE").length,
    excused: Object.values(attendance).filter((a) => a.status === "EXCUSED").length,
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  if (loading && cohorts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (noCohortMessage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-1">Track student attendance</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-amber-500/10 mb-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Cohorts Assigned</h3>
              <p className="text-muted-foreground">{noCohortMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-1">Click a status button to instantly save attendance</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!selectedCohortId}>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
              <DialogDescription>
                Create a new class session to track attendance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Session Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Week 1 - Day 1"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Session description..."
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mode">Mode</Label>
                  <Select
                    value={newSession.mode}
                    onValueChange={(v) => setNewSession({ ...newSession, mode: v })}
                  >
                    <SelectTrigger id="mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="ONSITE">Onsite</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Room 101 or Zoom Link"
                  value={newSession.location}
                  onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession} disabled={creatingSession}>
                {creatingSession ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Cohort Select */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Cohort</label>
                <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session Select */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Session</label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length === 0 ? (
                      <SelectItem value="no-sessions" disabled>No sessions available</SelectItem>
                    ) : (
                      sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          <div className="flex items-center gap-2">
                            {getModeIcon(session.mode)}
                            <span>{session.title}</span>
                            <span className="text-muted-foreground">
                              ({formatDate(session.date)})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Info */}
      {selectedSession && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {getModeIcon(selectedSession.mode)}
                <span className="font-medium">{selectedSession.mode}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{selectedSession.startTime} - {selectedSession.endTime}</span>
              </div>
              {selectedSession.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSession.location}</span>
                </div>
              )}
              <Badge variant={selectedSession.status === "COMPLETED" ? "default" : "secondary"}>
                {selectedSession.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary & Quick Actions */}
      {enrollments.length > 0 && selectedSessionId && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{summary.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.excused}</p>
              <p className="text-sm text-muted-foreground">Excused</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Quick Actions</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAll("PRESENT")}
                  disabled={savingUserId === "all"}
                >
                  {savingUserId === "all" ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  All Present
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedSession ? selectedSession.title : "Select a Session"}
          </CardTitle>
          <CardDescription>
            {enrollments.length} students enrolled
            {Object.keys(existingAttendance).length > 0 && (
              <span className="ml-2 text-emerald-600">
                (Attendance already recorded)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSessionId ? (
            <div className="text-center py-8 text-muted-foreground">
              {sessions.length === 0
                ? "No sessions created yet. Create a session to start tracking attendance."
                : "Select a session to record attendance"}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {cohorts.length === 0
                ? "You are not assigned to any cohorts"
                : "No students enrolled in this cohort"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => {
                  const record = attendance[enrollment.userId];
                  const status = record?.status || "PRESENT";

                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {enrollment.user.avatarUrl && (
                              <AvatarImage src={enrollment.user.avatarUrl} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(
                                enrollment.user.displayName || enrollment.user.username
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {enrollment.user.displayName || enrollment.user.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <Badge variant={getStatusVariant(status)}>{status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {savingUserId === enrollment.userId ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Saving...</span>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant={status === "PRESENT" ? "default" : "outline"}
                                onClick={() => handleStatusChange(enrollment.userId, "PRESENT")}
                                disabled={savingUserId !== null}
                                title="Present"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={status === "LATE" ? "secondary" : "outline"}
                                className={status === "LATE" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                                onClick={() => handleStatusChange(enrollment.userId, "LATE")}
                                disabled={savingUserId !== null}
                                title="Late"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={status === "ABSENT" ? "destructive" : "outline"}
                                onClick={() => handleStatusChange(enrollment.userId, "ABSENT")}
                                disabled={savingUserId !== null}
                                title="Absent"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={status === "EXCUSED" ? "secondary" : "outline"}
                                className={status === "EXCUSED" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                                onClick={() => handleStatusChange(enrollment.userId, "EXCUSED")}
                                disabled={savingUserId !== null}
                                title="Excused"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
