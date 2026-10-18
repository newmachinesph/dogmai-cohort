"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  MessageSquare,
  FileSpreadsheet,
  User,
  LogOut,
  Search,
  Moon,
  Sun,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string[];
  icon: React.ReactNode;
  action: () => void;
  roles?: ("ADMIN" | "STAFF" | "STUDENT")[];
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  // Register keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  const navigationItems: CommandItem[] = [
    // Admin items
    {
      id: "admin-dashboard",
      label: "Admin Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      action: () => navigate("/admin"),
      roles: ["ADMIN"],
      keywords: ["home", "overview"],
    },
    {
      id: "admin-cohorts",
      label: "Manage Cohorts",
      icon: <FolderKanban className="mr-2 h-4 w-4" />,
      action: () => navigate("/admin/cohorts"),
      roles: ["ADMIN"],
      keywords: ["classes", "groups"],
    },
    {
      id: "admin-users",
      label: "Manage Users",
      icon: <Users className="mr-2 h-4 w-4" />,
      action: () => navigate("/admin/users"),
      roles: ["ADMIN"],
      keywords: ["students", "staff", "members"],
    },
    {
      id: "admin-curriculum",
      label: "Curriculum",
      icon: <BookOpen className="mr-2 h-4 w-4" />,
      action: () => navigate("/admin/curriculum"),
      roles: ["ADMIN"],
      keywords: ["lessons", "modules", "content"],
    },

    // Staff items
    {
      id: "staff-dashboard",
      label: "Staff Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff"),
      roles: ["STAFF"],
      keywords: ["home", "overview"],
    },
    {
      id: "staff-cohorts",
      label: "My Cohorts",
      icon: <FolderKanban className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/cohorts"),
      roles: ["STAFF"],
      keywords: ["classes", "groups"],
    },
    {
      id: "staff-students",
      label: "Students",
      icon: <Users className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/students"),
      roles: ["STAFF"],
      keywords: ["members", "learners"],
    },
    {
      id: "staff-assignments",
      label: "Assignments",
      icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/assignments"),
      roles: ["STAFF"],
      keywords: ["tasks", "homework"],
    },
    {
      id: "staff-grading",
      label: "Grading",
      icon: <Award className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/grading"),
      roles: ["STAFF"],
      keywords: ["grades", "submissions", "review"],
    },
    {
      id: "staff-analytics",
      label: "Analytics",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/analytics"),
      roles: ["STAFF"],
      keywords: ["reports", "charts", "stats"],
    },
    {
      id: "staff-calendar",
      label: "Calendar",
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/calendar"),
      roles: ["STAFF"],
      keywords: ["schedule", "events", "dates"],
    },
    {
      id: "staff-bulk",
      label: "Bulk Operations",
      icon: <FileSpreadsheet className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/bulk"),
      roles: ["STAFF"],
      keywords: ["import", "export", "csv"],
    },
    {
      id: "staff-attendance",
      label: "Attendance",
      icon: <Calendar className="mr-2 h-4 w-4" />,
      action: () => navigate("/staff/attendance"),
      roles: ["STAFF"],
      keywords: ["present", "absent"],
    },

    // Student items
    {
      id: "student-dashboard",
      label: "Student Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      action: () => navigate("/student"),
      roles: ["STUDENT"],
      keywords: ["home", "overview"],
    },
    {
      id: "student-lessons",
      label: "Lessons",
      icon: <PlayCircle className="mr-2 h-4 w-4" />,
      action: () => navigate("/student/lessons"),
      roles: ["STUDENT"],
      keywords: ["learn", "content", "videos"],
    },
    {
      id: "student-assignments",
      label: "Assignments",
      icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
      action: () => navigate("/student/assignments"),
      roles: ["STUDENT"],
      keywords: ["tasks", "homework", "work"],
    },
    {
      id: "student-submissions",
      label: "My Submissions",
      icon: <Upload className="mr-2 h-4 w-4" />,
      action: () => navigate("/student/submissions"),
      roles: ["STUDENT"],
      keywords: ["work", "uploaded"],
    },
    {
      id: "student-progress",
      label: "Progress",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      action: () => navigate("/student/progress"),
      roles: ["STUDENT"],
      keywords: ["grades", "stats", "performance"],
    },
    {
      id: "student-calendar",
      label: "Calendar",
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
      action: () => navigate("/student/calendar"),
      roles: ["STUDENT"],
      keywords: ["schedule", "dates", "deadlines"],
    },

    // Common items
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      action: () => navigate("/messages"),
      keywords: ["chat", "inbox", "conversations"],
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: <Megaphone className="mr-2 h-4 w-4" />,
      action: () => {
        if (user?.role === "ADMIN") navigate("/admin/announcements");
        else if (user?.role === "STAFF") navigate("/staff/announcements");
        else navigate("/student/announcements");
      },
      keywords: ["news", "updates"],
    },
  ];

  const actionItems: CommandItem[] = [
    {
      id: "profile",
      label: "View Profile",
      icon: <User className="mr-2 h-4 w-4" />,
      action: () => navigate("/profile"),
      keywords: ["account", "me"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      action: () => navigate("/settings"),
      keywords: ["preferences", "config"],
    },
    {
      id: "theme-toggle",
      label: resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon:
        resolvedTheme === "dark" ? (
          <Sun className="mr-2 h-4 w-4" />
        ) : (
          <Moon className="mr-2 h-4 w-4" />
        ),
      action: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        setOpen(false);
      },
      keywords: ["dark", "light", "appearance"],
    },
    {
      id: "logout",
      label: "Sign Out",
      icon: <LogOut className="mr-2 h-4 w-4" />,
      action: () => {
        setOpen(false);
        logout();
      },
      keywords: ["exit", "leave"],
    },
  ];

  const filteredNavItems = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role as any)
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {filteredNavItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={item.action}
              keywords={item.keywords}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {item.shortcut.join("+")}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={item.action}
              keywords={item.keywords}
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
