"use client";

import { CalendarView } from "@/components/calendar/calendar-view";

export default function StudentCalendarPage() {
  return (
    <div className="container py-8">
      <CalendarView userRole="STUDENT" />
    </div>
  );
}
