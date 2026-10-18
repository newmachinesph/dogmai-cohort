"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueDateBadgeProps {
  dueDate: string | Date | null;
  isSubmitted?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function DueDateBadge({
  dueDate,
  isSubmitted = false,
  showIcon = true,
  className = "",
}: DueDateBadgeProps) {
  const status = useMemo(() => {
    if (!dueDate) return null;
    if (isSubmitted) return { type: "submitted" as const, label: "Submitted", color: "success" };

    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs < 0) {
      return { type: "overdue" as const, label: "Overdue", color: "destructive" };
    }

    if (diffHours <= 6) {
      const hours = Math.ceil(diffHours);
      return {
        type: "urgent" as const,
        label: hours <= 1 ? "Due in < 1hr" : `Due in ${hours}hrs`,
        color: "destructive",
      };
    }

    if (diffHours <= 24) {
      const hours = Math.floor(diffHours);
      return {
        type: "soon" as const,
        label: `Due in ${hours}hrs`,
        color: "warning",
      };
    }

    if (diffDays <= 3) {
      const days = Math.ceil(diffDays);
      return {
        type: "upcoming" as const,
        label: days === 1 ? "Due tomorrow" : `Due in ${days} days`,
        color: "warning",
      };
    }

    if (diffDays <= 7) {
      const days = Math.ceil(diffDays);
      return {
        type: "week" as const,
        label: `Due in ${days} days`,
        color: "default",
      };
    }

    return {
      type: "later" as const,
      label: `Due ${due.toLocaleDateString([], { month: "short", day: "numeric" })}`,
      color: "secondary",
    };
  }, [dueDate, isSubmitted]);

  if (!status) return null;

  const getIcon = () => {
    if (!showIcon) return null;
    switch (status.type) {
      case "submitted":
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case "overdue":
      case "urgent":
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      case "soon":
      case "upcoming":
        return <Clock className="h-3 w-3 mr-1" />;
      default:
        return <Calendar className="h-3 w-3 mr-1" />;
    }
  };

  const getVariant = () => {
    switch (status.color) {
      case "success":
        return "default";
      case "destructive":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return status.color as "default" | "secondary" | "outline";
    }
  };

  const getCustomClasses = () => {
    switch (status.color) {
      case "success":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "";
    }
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        "flex items-center text-xs font-medium",
        getCustomClasses(),
        status.type === "urgent" && "animate-pulse",
        className
      )}
    >
      {getIcon()}
      {status.label}
    </Badge>
  );
}

// Utility function to format due date with countdown
export function formatDueDate(dueDate: string | Date | null): string {
  if (!dueDate) return "No due date";

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffDays));
    if (overdueDays === 0) return "Overdue by less than a day";
    return `Overdue by ${overdueDays} day${overdueDays > 1 ? "s" : ""}`;
  }

  if (diffHours <= 1) return "Due in less than an hour";
  if (diffHours <= 24) return `Due in ${Math.floor(diffHours)} hours`;
  if (diffDays <= 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${Math.ceil(diffDays)} days`;

  return `Due ${due.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`;
}

// Countdown timer component
interface DueDateCountdownProps {
  dueDate: string | Date;
  onExpire?: () => void;
}

export function DueDateCountdown({ dueDate, onExpire }: DueDateCountdownProps) {
  const countdown = useMemo(() => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0 };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { expired: false, days, hours, minutes };
  }, [dueDate]);

  if (countdown.expired) {
    return (
      <span className="text-destructive font-medium">Deadline passed</span>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {countdown.days > 0 && (
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
          {countdown.days}d
        </span>
      )}
      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
        {countdown.hours.toString().padStart(2, "0")}h
      </span>
      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
        {countdown.minutes.toString().padStart(2, "0")}m
      </span>
    </div>
  );
}
