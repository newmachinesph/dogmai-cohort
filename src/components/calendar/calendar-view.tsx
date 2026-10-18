"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./calendar.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ExternalLink } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  type: "cohort" | "assignment" | "session";
  color: string;
  url?: string;
  extendedProps?: {
    lessonTitle?: string;
    cohortName?: string;
    assignmentId?: string;
    maxPoints?: number;
    status?: string;
    sessionId?: string;
  };
}

interface Cohort {
  id: string;
  name: string;
}

interface CalendarViewProps {
  userRole: "ADMIN" | "STAFF" | "STUDENT";
}

export function CalendarView({ userRole }: CalendarViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    try {
      const cohortParam = selectedCohort !== "all" ? `&cohortId=${selectedCohort}` : "";
      const res = await fetch(
        `/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}${cohortParam}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCohort]);

  const fetchCohorts = async () => {
    try {
      const res = await fetch("/api/cohorts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCohorts(data.cohorts || []);
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    }
  };

  useEffect(() => {
    fetchCohorts();
    // Fetch initial month of events
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    fetchEvents(start, end);
  }, []);

  useEffect(() => {
    // Refetch when cohort changes
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    fetchEvents(start, end);
  }, [selectedCohort, fetchEvents]);

  const handleDatesSet = (arg: { start: Date; end: Date }) => {
    fetchEvents(arg.start, arg.end);
  };

  const handleEventClick = (info: { event: any }) => {
    const event = events.find((e) => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setDialogOpen(true);
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "cohort":
        return "Cohort Event";
      case "assignment":
        return "Assignment Due";
      case "session":
        return "Class Session";
      default:
        return "Event";
    }
  };

  const getEventTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "cohort":
        return "default";
      case "assignment":
        return "secondary";
      case "session":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendar
              </CardTitle>
              <CardDescription>
                View assignments, sessions, and important dates
              </CardDescription>
            </div>
            {userRole !== "STUDENT" && (
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Cohorts" />
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="calendar-wrapper">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={events.map((event) => ({
                id: event.id,
                title: event.title,
                start: event.start,
                allDay: event.allDay,
                backgroundColor: event.color,
                borderColor: event.color,
              }))}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              height="auto"
              dayMaxEvents={3}
              eventDisplay="block"
              eventTimeFormat={{
                hour: "numeric",
                minute: "2-digit",
                meridiem: "short",
              }}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2563eb]" />
              <span className="text-sm text-muted-foreground">Cohort Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#dc2626]" />
              <span className="text-sm text-muted-foreground">Cohort End</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <span className="text-sm text-muted-foreground">Assignment Due</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
              <span className="text-sm text-muted-foreground">Class Session</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent && new Date(selectedEvent.start).toLocaleDateString([], {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={getEventTypeBadgeVariant(selectedEvent.type)}>
                  {getEventTypeLabel(selectedEvent.type)}
                </Badge>
                {selectedEvent.extendedProps?.status && (
                  <Badge
                    variant={
                      selectedEvent.extendedProps.status === "PRESENT"
                        ? "default"
                        : selectedEvent.extendedProps.status === "ABSENT"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {selectedEvent.extendedProps.status}
                  </Badge>
                )}
              </div>

              {selectedEvent.extendedProps?.cohortName && (
                <div>
                  <p className="text-sm text-muted-foreground">Cohort</p>
                  <p className="font-medium">{selectedEvent.extendedProps.cohortName}</p>
                </div>
              )}

              {selectedEvent.extendedProps?.lessonTitle && (
                <div>
                  <p className="text-sm text-muted-foreground">Lesson</p>
                  <p className="font-medium">{selectedEvent.extendedProps.lessonTitle}</p>
                </div>
              )}

              {selectedEvent.extendedProps?.maxPoints && (
                <div>
                  <p className="text-sm text-muted-foreground">Max Points</p>
                  <p className="font-medium">{selectedEvent.extendedProps.maxPoints}</p>
                </div>
              )}

              {selectedEvent.url && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setDialogOpen(false);
                    router.push(selectedEvent.url!);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
