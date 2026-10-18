"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useNotificationsStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  ClipboardCheck,
  Award,
  Calendar,
  CalendarDays,
  Megaphone,
  PlayCircle,
  BarChart3,
  Settings,
  X,
  GraduationCap,
  Upload,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";

type Role = "ADMIN" | "STAFF" | "STUDENT";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: number;
  section?: string;
}

const navItems: NavItem[] = [
  // Admin items - Main
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["ADMIN"], section: "main" },
  { label: "Cohorts", href: "/admin/cohorts", icon: <FolderKanban className="w-5 h-5" />, roles: ["ADMIN"], section: "main" },
  { label: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" />, roles: ["ADMIN"], section: "main" },
  { label: "Curriculum", href: "/admin/curriculum", icon: <BookOpen className="w-5 h-5" />, roles: ["ADMIN"], section: "main" },
  { label: "Announcements", href: "/admin/announcements", icon: <Megaphone className="w-5 h-5" />, roles: ["ADMIN"], section: "main" },

  // Admin items - Operations (staff features accessible to admin)
  { label: "Assignments", href: "/staff/assignments", icon: <ClipboardCheck className="w-5 h-5" />, roles: ["ADMIN"], section: "operations" },
  { label: "Grading", href: "/staff/grading", icon: <Award className="w-5 h-5" />, roles: ["ADMIN"], section: "operations" },
  { label: "Attendance", href: "/staff/attendance", icon: <Calendar className="w-5 h-5" />, roles: ["ADMIN"], section: "operations" },
  { label: "Analytics", href: "/staff/analytics", icon: <BarChart3 className="w-5 h-5" />, roles: ["ADMIN"], section: "operations" },
  { label: "Calendar", href: "/staff/calendar", icon: <CalendarDays className="w-5 h-5" />, roles: ["ADMIN"], section: "operations" },
  { label: "Bulk Ops", href: "/staff/bulk", icon: <FileSpreadsheet className="w-5 h-5" />, roles: ["ADMIN"], section: "operations" },

  // Admin items - Other
  { label: "Messages", href: "/messages", icon: <MessageSquare className="w-5 h-5" />, roles: ["ADMIN"], section: "other" },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-5 h-5" />, roles: ["ADMIN"], section: "other" },

  // Staff items
  { label: "Dashboard", href: "/staff", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "My Cohorts", href: "/staff/cohorts", icon: <FolderKanban className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Students", href: "/staff/students", icon: <Users className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Assignments", href: "/staff/assignments", icon: <ClipboardCheck className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Grading", href: "/staff/grading", icon: <Award className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Attendance", href: "/staff/attendance", icon: <Calendar className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Announcements", href: "/staff/announcements", icon: <Megaphone className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Analytics", href: "/staff/analytics", icon: <BarChart3 className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Calendar", href: "/staff/calendar", icon: <CalendarDays className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Bulk Ops", href: "/staff/bulk", icon: <FileSpreadsheet className="w-5 h-5" />, roles: ["STAFF"] },
  { label: "Messages", href: "/messages", icon: <MessageSquare className="w-5 h-5" />, roles: ["STAFF"] },

  // Student items
  { label: "Dashboard", href: "/student", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Lessons", href: "/student/lessons", icon: <PlayCircle className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardCheck className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Submissions", href: "/student/submissions", icon: <Upload className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Progress", href: "/student/progress", icon: <BarChart3 className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Announcements", href: "/student/announcements", icon: <Megaphone className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Calendar", href: "/student/calendar", icon: <CalendarDays className="w-5 h-5" />, roles: ["STUDENT"] },
  { label: "Messages", href: "/messages", icon: <MessageSquare className="w-5 h-5" />, roles: ["STUDENT"] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extracted NavLink component for cleaner code
function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose?: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Use Zustand store for notification counts
  const {
    pendingGradingCount,
    unreadMessageCount,
    setPendingGradingCount,
    setUnreadMessageCount
  } = useNotificationsStore();

  // Fetch pending grading count for staff and admin
  useEffect(() => {
    if (user?.role === "STAFF" || user?.role === "ADMIN") {
      fetch("/api/submissions?status=SUBMITTED")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.submissions) {
            setPendingGradingCount(data.submissions.length);
          }
        })
        .catch(() => {});
    }
  }, [user?.role, setPendingGradingCount]);

  // Fetch unread message count for all users
  useEffect(() => {
    if (!user) return;

    const fetchUnread = () => {
      fetch("/api/conversations/unread")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            setUnreadMessageCount(data.unreadCount);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    // Poll for unread messages every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user, setUnreadMessageCount]);

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role as Role));

  // Add dynamic badges for grading and messages
  const itemsWithBadges = filteredItems.map((item) => {
    if (item.href === "/staff/grading" && pendingGradingCount > 0) {
      return { ...item, badge: pendingGradingCount };
    }
    if (item.href === "/messages" && unreadMessageCount > 0) {
      return { ...item, badge: unreadMessageCount };
    }
    return item;
  });

  // Group items by section for admin
  const isAdmin = user.role === "ADMIN";
  const mainItems = isAdmin ? itemsWithBadges.filter(i => i.section === "main") : [];
  const operationsItems = isAdmin ? itemsWithBadges.filter(i => i.section === "operations") : [];
  const otherItems = isAdmin ? itemsWithBadges.filter(i => i.section === "other") : [];

  return (
    <div className="flex flex-col h-full">
      {/* Logo (mobile only) */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-primary">DOGM</span>
            <span className="text-foreground">.AI</span>
          </span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {isAdmin ? (
          <>
            {/* Admin: Main Section */}
            {mainItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
            ))}

            {/* Admin: Operations Section */}
            {operationsItems.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Operations
                  </p>
                </div>
                {operationsItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </>
            )}

            {/* Admin: Other Section */}
            {otherItems.length > 0 && (
              <>
                <Separator className="my-4" />
                {otherItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </>
            )}
          </>
        ) : (
          // Staff and Student: Flat list
          itemsWithBadges.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          DOGM.AI Cohort Beta
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:top-16 lg:border-r lg:bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
