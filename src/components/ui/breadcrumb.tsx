"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fragment, useMemo } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
  separator?: React.ReactNode;
}

// Default route labels for common paths
const routeLabels: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  student: "Student",
  cohorts: "Cohorts",
  users: "Users",
  curriculum: "Curriculum",
  assignments: "Assignments",
  grading: "Grading",
  attendance: "Attendance",
  analytics: "Analytics",
  calendar: "Calendar",
  bulk: "Bulk Operations",
  settings: "Settings",
  announcements: "Announcements",
  messages: "Messages",
  lessons: "Lessons",
  submissions: "Submissions",
  progress: "Progress",
  profile: "Profile",
  students: "Students",
};

// Generate breadcrumbs from current path
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Skip IDs in breadcrumbs (UUIDs or numeric IDs)
    if (
      segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
      segment.match(/^\d+$/) ||
      segment.length === 24 // MongoDB ObjectId length
    ) {
      // Add a generic "Details" label for ID segments
      breadcrumbs.push({
        label: "Details",
        href: isLast ? undefined : currentPath,
      });
      return;
    }

    const label =
      routeLabels[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}

export function Breadcrumb({
  items,
  showHome = true,
  className,
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Use provided items or generate from path
  const breadcrumbItems = useMemo(() => {
    if (items) return items;
    return generateBreadcrumbs(pathname);
  }, [items, pathname]);

  if (breadcrumbItems.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-2">
        {showHome && (
          <li className="flex items-center">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
          </li>
        )}

        {breadcrumbItems.map((item, index) => (
          <Fragment key={index}>
            <li className="flex items-center">{separator}</li>
            <li className="flex items-center">
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

// Compact breadcrumb for mobile/small spaces
interface CompactBreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function CompactBreadcrumb({ items, className }: CompactBreadcrumbProps) {
  const pathname = usePathname();

  const breadcrumbItems = useMemo(() => {
    if (items) return items;
    return generateBreadcrumbs(pathname);
  }, [items, pathname]);

  // Only show the parent and current page
  const displayItems = breadcrumbItems.slice(-2);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-2">
        {displayItems.length > 1 && displayItems[0].href && (
          <>
            <li>
              <Link
                href={displayItems[0].href}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                {displayItems[0].label}
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
          </>
        )}
        <li>
          <span className="font-medium">
            {displayItems[displayItems.length - 1].label}
          </span>
        </li>
      </ol>
    </nav>
  );
}

// Page header with breadcrumb integration
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbItems?: BreadcrumbItem[];
  showBreadcrumb?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbItems,
  showBreadcrumb = true,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {showBreadcrumb && <Breadcrumb items={breadcrumbItems} />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
