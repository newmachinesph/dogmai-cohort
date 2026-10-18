# UX Improvements - Implementation Guide

This guide provides code examples and implementation details for the high-priority UX recommendations identified in the analysis report.

---

## 1. Skeleton Loading Components

### 1.1 Create Reusable Skeleton Components

**File: `src/components/skeletons/dashboard-skeleton.tsx`**

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
            <Skeleton className="h-3 w-24 mt-3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CohortListSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-muted/50"
          >
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="w-32 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Stats */}
      <DashboardStatsSkeleton />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CohortListSkeleton />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-2 w-2 rounded-full mt-2" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**File: `src/components/skeletons/table-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  columnWidths?: string[];
}

export function TableSkeleton({
  columns,
  rows = 5,
  columnWidths,
}: TableSkeletonProps) {
  const widths = columnWidths || Array(columns).fill("w-24");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[...Array(columns)].map((_, i) => (
            <TableHead key={i}>
              <Skeleton className={`h-4 ${widths[i]}`} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(rows)].map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {[...Array(columns)].map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className={`h-4 ${widths[colIndex]}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function GradingTableSkeleton() {
  return (
    <TableSkeleton
      columns={6}
      rows={8}
      columnWidths={["w-40", "w-48", "w-32", "w-24", "w-20", "w-16"]}
    />
  );
}
```

### 1.2 Usage in Pages

Update dashboard pages to use skeletons:

```tsx
// src/app/admin/page.tsx
import { AdminDashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

export default function AdminDashboard() {
  // ... existing code

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  // ... rest of component
}
```

---

## 2. Breadcrumb Navigation

### 2.1 Create Breadcrumb Component

**File: `src/components/ui/breadcrumb.tsx`**

```tsx
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-muted-foreground", className)}
    >
      <ol className="flex items-center gap-1">
        <li>
          <Link
            href="/"
            className="hover:text-foreground transition-colors p-1"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors px-1"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium px-1">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### 2.2 Create Breadcrumb Hook

**File: `src/hooks/use-breadcrumbs.ts`**

```tsx
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BreadcrumbConfig {
  [key: string]: {
    label: string;
    parent?: string;
  };
}

const pathConfig: BreadcrumbConfig = {
  "/admin": { label: "Dashboard" },
  "/admin/cohorts": { label: "Cohorts", parent: "/admin" },
  "/admin/users": { label: "Users", parent: "/admin" },
  "/admin/curriculum": { label: "Curriculum", parent: "/admin" },
  "/admin/settings": { label: "Settings", parent: "/admin" },
  "/staff": { label: "Dashboard" },
  "/staff/grading": { label: "Grading", parent: "/staff" },
  "/staff/assignments": { label: "Assignments", parent: "/staff" },
  "/staff/attendance": { label: "Attendance", parent: "/staff" },
  "/staff/analytics": { label: "Analytics", parent: "/staff" },
  "/student": { label: "Dashboard" },
  "/student/lessons": { label: "Lessons", parent: "/student" },
  "/student/assignments": { label: "Assignments", parent: "/student" },
  "/student/progress": { label: "Progress", parent: "/student" },
  "/messages": { label: "Messages" },
};

export function useBreadcrumbs(customLabel?: string) {
  const pathname = usePathname();

  return useMemo(() => {
    const items: { label: string; href?: string }[] = [];

    // Handle dynamic routes
    const basePath = pathname.replace(/\/[a-z0-9]+$/i, "");
    const isDynamic = basePath !== pathname;

    let currentPath = isDynamic ? basePath : pathname;
    const paths: string[] = [];

    // Build path hierarchy
    while (currentPath && pathConfig[currentPath]) {
      paths.unshift(currentPath);
      currentPath = pathConfig[currentPath].parent || "";
    }

    // Convert to breadcrumb items
    paths.forEach((path, index) => {
      items.push({
        label: pathConfig[path].label,
        href: index < paths.length - 1 || isDynamic ? path : undefined,
      });
    });

    // Add dynamic segment label
    if (isDynamic && customLabel) {
      items.push({ label: customLabel });
    }

    return items;
  }, [pathname, customLabel]);
}
```

### 2.3 Usage Example

```tsx
// src/app/admin/cohorts/[id]/page.tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";

export default function CohortDetailPage() {
  const [cohort, setCohort] = useState(null);
  const breadcrumbs = useBreadcrumbs(cohort?.name);

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbs} className="mb-4" />
      {/* rest of page */}
    </div>
  );
}
```

---

## 3. Inline Grading Panel

### 3.1 Create Grading Panel Component

**File: `src/components/grading/inline-grading-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  FileText,
  Github,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  githubUrl: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  assignment: {
    id: string;
    title: string;
    maxPoints: number;
    passingScore: number;
    rubric: string | null;
    cohort: {
      id: string;
      name: string;
    };
  };
}

interface InlineGradingPanelProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onGraded: (submission: Submission) => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function InlineGradingPanel({
  submission,
  isOpen,
  onClose,
  onGraded,
  onNavigate,
  hasPrev,
  hasNext,
}: InlineGradingPanelProps) {
  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when submission changes
  useState(() => {
    if (submission) {
      setScore(submission.score?.toString() || "");
      setFeedback(submission.feedback || "");
    }
  });

  const handleGrade = async () => {
    if (!submission) return;

    const numScore = parseInt(score);
    if (isNaN(numScore) || numScore < 0 || numScore > submission.assignment.maxPoints) {
      toast.error(`Score must be between 0 and ${submission.assignment.maxPoints}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: numScore,
          feedback: feedback.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to grade");

      const data = await res.json();
      toast.success("Submission graded");
      onGraded(data.submission);
    } catch (error) {
      toast.error("Failed to save grade");
    } finally {
      setSaving(false);
    }
  };

  const handleGradeAndNext = async () => {
    await handleGrade();
    if (hasNext) {
      onNavigate("next");
    }
  };

  if (!submission) return null;

  const passed = (parseInt(score) || 0) >= submission.assignment.passingScore;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-none">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={!hasPrev}
                onClick={() => onNavigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!hasNext}
                onClick={() => onNavigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant={submission.status === "LATE" ? "destructive" : "default"}>
              {submission.status}
            </Badge>
          </div>
          <SheetTitle className="text-left">{submission.assignment.title}</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-6 overflow-y-auto h-[calc(100vh-200px)]">
          {/* Student Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {submission.user.avatarUrl && (
                <AvatarImage src={submission.user.avatarUrl} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(submission.user.displayName || submission.user.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {submission.user.displayName || submission.user.username}
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted {formatRelativeTime(submission.submittedAt)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Submission Content */}
          <div className="space-y-4">
            <h4 className="font-medium">Submission</h4>

            {submission.content && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
              </div>
            )}

            {submission.fileUrl && (
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm">{submission.fileName}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            )}

            {submission.githubUrl && (
              <a
                href={submission.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Github className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">{submission.githubUrl}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            )}
          </div>

          <Separator />

          {/* Grading Form */}
          <div className="space-y-4">
            <h4 className="font-medium">Grade</h4>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">
                  Score (max {submission.assignment.maxPoints})
                </label>
                <Input
                  type="number"
                  min={0}
                  max={submission.assignment.maxPoints}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Enter score"
                  className="mt-1"
                />
              </div>
              <div className="pt-6">
                {score && (
                  <Badge variant={passed ? "default" : "destructive"}>
                    {passed ? "PASSING" : "NEEDS WORK"}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Feedback</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback for the student..."
                className="mt-1 min-h-[120px]"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleGrade} disabled={saving || !score}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Grade
          </Button>
          {hasNext && (
            <Button onClick={handleGradeAndNext} disabled={saving || !score}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Grade & Next
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 3.2 Update Grading Page

```tsx
// Update src/app/staff/grading/page.tsx to include:

import { InlineGradingPanel } from "@/components/grading/inline-grading-panel";

// Add state
const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
const [gradingPanelOpen, setGradingPanelOpen] = useState(false);

// Add navigation
const currentIndex = selectedSubmission
  ? filteredSubmissions.findIndex((s) => s.id === selectedSubmission.id)
  : -1;

const handleNavigate = (direction: "prev" | "next") => {
  const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
  if (newIndex >= 0 && newIndex < filteredSubmissions.length) {
    setSelectedSubmission(filteredSubmissions[newIndex]);
  }
};

const handleGraded = (updatedSubmission: Submission) => {
  setSubmissions((prev) =>
    prev.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s))
  );
};

// In table row, update click handler:
<TableRow
  key={submission.id}
  className="cursor-pointer"
  onClick={() => {
    setSelectedSubmission(submission);
    setGradingPanelOpen(true);
  }}
>

// Add panel at end of component:
<InlineGradingPanel
  submission={selectedSubmission}
  isOpen={gradingPanelOpen}
  onClose={() => {
    setGradingPanelOpen(false);
    setSelectedSubmission(null);
  }}
  onGraded={handleGraded}
  onNavigate={handleNavigate}
  hasPrev={currentIndex > 0}
  hasNext={currentIndex < filteredSubmissions.length - 1}
/>
```

---

## 4. Global Search (Command Palette)

### 4.1 Create Command Palette Component

**File: `src/components/command-palette.tsx`**

```tsx
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
  Users,
  FolderKanban,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Settings,
  BarChart3,
  Calendar,
  Search,
  Loader2,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "user" | "cohort" | "assignment" | "lesson";
  title: string;
  subtitle?: string;
  href: string;
}

const quickActions = {
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: BarChart3 },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Cohorts", href: "/admin/cohorts", icon: FolderKanban },
    { label: "Curriculum", href: "/admin/curriculum", icon: BookOpen },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  STAFF: [
    { label: "Dashboard", href: "/staff", icon: BarChart3 },
    { label: "Grading", href: "/staff/grading", icon: ClipboardList },
    { label: "My Cohorts", href: "/staff/cohorts", icon: FolderKanban },
    { label: "Analytics", href: "/staff/analytics", icon: BarChart3 },
    { label: "Calendar", href: "/staff/calendar", icon: Calendar },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student", icon: BarChart3 },
    { label: "Lessons", href: "/student/lessons", icon: BookOpen },
    { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
    { label: "Progress", href: "/student/progress", icon: BarChart3 },
    { label: "Messages", href: "/messages", icon: MessageSquare },
  ],
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Toggle with keyboard shortcut
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

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const role = (user?.role || "STUDENT") as keyof typeof quickActions;
  const actions = quickActions[role];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search or jump to..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !query && (
          <>
            <CommandEmpty>Start typing to search...</CommandEmpty>
            <CommandGroup heading="Quick Actions">
              {actions.map((action) => (
                <CommandItem
                  key={action.href}
                  onSelect={() => handleSelect(action.href)}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!loading && query && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {!loading && results.length > 0 && (
          <>
            {["user", "cohort", "assignment", "lesson"].map((type) => {
              const typeResults = results.filter((r) => r.type === type);
              if (typeResults.length === 0) return null;

              const Icon =
                type === "user"
                  ? Users
                  : type === "cohort"
                  ? FolderKanban
                  : type === "assignment"
                  ? ClipboardList
                  : BookOpen;

              return (
                <CommandGroup
                  key={type}
                  heading={type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                >
                  {typeResults.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result.href)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <div>
                        <p>{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

### 4.2 Add Search API Endpoint

**File: `src/app/api/search/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];

    // Search users (admin/staff only)
    if (user.role === "ADMIN" || user.role === "STAFF") {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { displayName: { contains: query } },
            { username: { contains: query } },
            { email: { contains: query } },
          ],
        },
        take: limit,
        select: {
          id: true,
          displayName: true,
          username: true,
          role: true,
        },
      });

      results.push(
        ...users.map((u) => ({
          id: u.id,
          type: "user",
          title: u.displayName || u.username,
          subtitle: u.role,
          href: user.role === "ADMIN" ? `/admin/users/${u.id}` : `/staff/students/${u.id}`,
        }))
      );
    }

    // Search cohorts
    const cohortWhere: any = {
      name: { contains: query },
    };

    if (user.role === "STAFF") {
      cohortWhere.staffAssignments = { some: { userId: user.id } };
    } else if (user.role === "STUDENT") {
      cohortWhere.enrollments = { some: { userId: user.id } };
    }

    const cohorts = await prisma.cohort.findMany({
      where: cohortWhere,
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    results.push(
      ...cohorts.map((c) => ({
        id: c.id,
        type: "cohort",
        title: c.name,
        subtitle: c.status,
        href:
          user.role === "ADMIN"
            ? `/admin/cohorts/${c.id}`
            : `/staff/cohorts/${c.id}`,
      }))
    );

    // Search assignments
    const assignmentWhere: any = {
      title: { contains: query },
      isPublished: true,
    };

    if (user.role === "STUDENT") {
      assignmentWhere.cohort = {
        enrollments: { some: { userId: user.id } },
      };
    }

    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      take: limit,
      select: {
        id: true,
        title: true,
        cohort: { select: { name: true } },
      },
    });

    results.push(
      ...assignments.map((a) => ({
        id: a.id,
        type: "assignment",
        title: a.title,
        subtitle: a.cohort.name,
        href:
          user.role === "STUDENT"
            ? `/student/assignments/${a.id}`
            : `/staff/assignments/${a.id}`,
      }))
    );

    // Search lessons (students)
    if (user.role === "STUDENT") {
      const lessons = await prisma.lesson.findMany({
        where: {
          title: { contains: query },
          isPublished: true,
        },
        take: limit,
        select: {
          id: true,
          title: true,
          module: { select: { title: true } },
        },
      });

      results.push(
        ...lessons.map((l) => ({
          id: l.id,
          type: "lesson",
          title: l.title,
          subtitle: l.module.title,
          href: `/student/lessons/${l.id}`,
        }))
      );
    }

    return NextResponse.json({ results: results.slice(0, limit) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
```

### 4.3 Add to Layout

```tsx
// src/app/(dashboard)/layout.tsx or src/components/layout/dashboard-layout.tsx
import { CommandPalette } from "@/components/command-palette";

export function DashboardLayout({ children }) {
  return (
    <>
      <CommandPalette />
      {/* existing layout */}
    </>
  );
}
```

---

## 5. Mobile Message Input Fix

### 5.1 Update Message Page Styles

**File: Update `src/app/messages/[id]/page.tsx`**

```tsx
// Replace the card height calculation
<Card className="flex flex-col h-[calc(100dvh-12rem)]">

// Or use CSS custom properties
<Card className="flex flex-col message-container">

// Add to global CSS (src/app/globals.css):
.message-container {
  height: calc(100dvh - 12rem);
}

@supports (-webkit-touch-callout: none) {
  .message-container {
    height: calc(100dvh - 12rem - env(safe-area-inset-bottom));
  }
}

// For the input area, ensure it's always visible:
<div className="border-t p-4 bg-background sticky bottom-0">
```

### 5.2 Add Visual Viewport Handling

```tsx
// src/hooks/use-visual-viewport.ts
import { useState, useEffect } from "react";

export function useVisualViewport() {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    const updateHeight = () => {
      setHeight(viewport.height);
    };

    viewport.addEventListener("resize", updateHeight);
    viewport.addEventListener("scroll", updateHeight);
    updateHeight();

    return () => {
      viewport.removeEventListener("resize", updateHeight);
      viewport.removeEventListener("scroll", updateHeight);
    };
  }, []);

  return height;
}

// Usage in message page:
const viewportHeight = useVisualViewport();
const cardStyle = viewportHeight
  ? { height: `${viewportHeight - 192}px` }
  : undefined;

<Card className="flex flex-col" style={cardStyle}>
```

---

## 6. Enhanced Empty States

### 6.1 Create Empty State Component

**File: `src/components/empty-state.tsx`**

```tsx
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            action.href ? (
              <Button asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button variant="outline" asChild>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
```

### 6.2 Usage Examples

```tsx
// No assignments
<EmptyState
  icon={ClipboardList}
  title="No assignments yet"
  description="Assignments will appear here once your instructor publishes them. In the meantime, continue with your lessons!"
  action={{
    label: "Continue Learning",
    href: "/student/lessons",
  }}
/>

// No submissions to grade
<EmptyState
  icon={CheckCircle}
  title="All caught up!"
  description="There are no submissions waiting for grading. Great work staying on top of things."
  action={{
    label: "View Graded",
    onClick: () => setStatusFilter("graded"),
  }}
/>

// No cohorts assigned (staff)
<EmptyState
  icon={FolderKanban}
  title="No cohorts assigned"
  description="You haven't been assigned to any cohorts yet. Contact an administrator to get started."
  action={{
    label: "Contact Admin",
    href: "/messages",
  }}
/>
```

---

## 7. Keyboard Shortcuts Hook

**File: `src/hooks/use-keyboard-shortcuts.ts`**

```tsx
import { useEffect, useCallback } from "react";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Usage in grading page:
useKeyboardShortcuts([
  {
    key: "n",
    handler: () => hasNext && handleNavigate("next"),
  },
  {
    key: "p",
    handler: () => hasPrev && handleNavigate("prev"),
  },
  {
    key: "Enter",
    ctrl: true,
    handler: handleGrade,
  },
  {
    key: "Escape",
    handler: () => setGradingPanelOpen(false),
  },
]);
```

---

## Summary

This implementation guide covers the highest-priority UX improvements:

1. **Skeleton Loading** - Reduces perceived load time and prevents layout shift
2. **Breadcrumb Navigation** - Improves wayfinding and reduces clicks
3. **Inline Grading Panel** - Dramatically speeds up grading workflow
4. **Global Search** - Enables quick navigation with Cmd+K
5. **Mobile Input Fix** - Resolves keyboard overlap issues
6. **Enhanced Empty States** - Provides guidance and next actions
7. **Keyboard Shortcuts** - Improves power user efficiency

Each section provides complete, production-ready code that can be directly implemented in the DOGM.AI LMS platform.
