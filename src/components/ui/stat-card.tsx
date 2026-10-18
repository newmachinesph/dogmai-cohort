"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  className?: string;
  loading?: boolean;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: {
    icon: "bg-muted text-muted-foreground",
    trend: {
      positive: "text-green-600",
      negative: "text-red-600",
    },
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    trend: {
      positive: "text-green-600",
      negative: "text-red-600",
    },
  },
  success: {
    icon: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    trend: {
      positive: "text-green-600",
      negative: "text-red-600",
    },
  },
  warning: {
    icon: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    trend: {
      positive: "text-green-600",
      negative: "text-red-600",
    },
  },
  danger: {
    icon: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    trend: {
      positive: "text-green-600",
      negative: "text-red-600",
    },
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  loading = false,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-2 text-xs">
                {trend && (
                  <span
                    className={cn(
                      "font-medium",
                      trend.isPositive ?? trend.value >= 0
                        ? styles.trend.positive
                        : styles.trend.negative
                    )}
                  >
                    {trend.value >= 0 ? "+" : ""}
                    {trend.value}%
                  </span>
                )}
                {subtitle && (
                  <span className="text-muted-foreground">{subtitle}</span>
                )}
                {trend?.label && (
                  <span className="text-muted-foreground">{trend.label}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg",
                styles.icon
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Grid wrapper for multiple stat cards
interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatCardGrid({
  children,
  columns = 4,
  className,
}: StatCardGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
