"use client";

import { CalendarView } from "@/components/calendar/calendar-view";

export default function StaffCalendarPage() {
  return (
    <div className="container py-8">
      <CalendarView userRole="STAFF" />
    </div>
  );
}
