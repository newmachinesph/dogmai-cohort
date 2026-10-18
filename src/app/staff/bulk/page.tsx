"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkImportDialog } from "@/components/bulk/bulk-import-dialog";
import { toast } from "sonner";
import {
  Users,
  Award,
  UserPlus,
  FileSpreadsheet,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Cohort {
  id: string;
  name: string;
}

interface User {
  role: string;
}

export default function BulkOperationsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [exportCohortId, setExportCohortId] = useState<string>("all");
  const [exporting, setExporting] = useState<string | null>(null);
  const [noCohortMessage, setNoCohortMessage] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    // Fetch current user
    fetch("/api/auth/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Fetch cohorts
    fetch("/api/cohorts")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.cohorts) {
          setCohorts(data.cohorts);
        }
        if (data?.message) {
          setNoCohortMessage(data.message);
        }
      })
      .catch(() => {});
  }, []);

  const handleExport = async (type: "students" | "grades" | "attendance") => {
    setExporting(type);
    try {
      const cohortParam = exportCohortId !== "all" ? `?cohortId=${exportCohortId}` : "";
      const endpoint = `/api/bulk/export-${type}${cohortParam}`;

      const res = await fetch(endpoint);
      if (!res.ok) {
        // Try to parse error message from JSON response
        const contentType = res.headers.get("Content-Type");
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Export failed");
        }
        throw new Error("Export failed");
      }

      // Get the filename from Content-Disposition header or create default
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `${type}-export.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    } catch (error) {
      console.error("Export error:", error);
      const message = error instanceof Error ? error.message : `Failed to export ${type}`;
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bulk Operations</h1>
        <p className="text-muted-foreground">
          Import students, batch grade submissions, and more
        </p>
      </div>

      <div className={`grid gap-6 ${isAdmin ? "md:grid-cols-2" : "md:grid-cols-1 max-w-xl"}`}>
        {/* Import Students - Admin Only */}
        {isAdmin && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Import Students
              </CardTitle>
              <CardDescription>
                Bulk import students from a CSV file and optionally enroll them in a cohort
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">CSV Format:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>email (required)</li>
                  <li>username (required)</li>
                  <li>display_name (optional)</li>
                  <li>password (optional, auto-generated if empty)</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open("/api/bulk/templates?type=students", "_blank")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button onClick={() => setImportDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Import Students
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batch Grading */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Batch Grading
            </CardTitle>
            <CardDescription>
              Grade multiple submissions at once using a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {noCohortMessage ? (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <div className="p-3 rounded-full bg-amber-500/10 mb-3">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold mb-1">No Cohorts Assigned</h3>
                <p className="text-sm text-muted-foreground">{noCohortMessage}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">CSV Format:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>student_email (required)</li>
                    <li>assignment_id (required)</li>
                    <li>grade (required, numeric)</li>
                    <li>feedback (optional)</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open("/api/bulk/templates?type=grades", "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button onClick={() => setGradeDialogOpen(true)}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Batch Grade
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  1
                </div>
                <h3 className="font-medium">Download Template</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-10">
                Start with our CSV template to ensure correct formatting
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  2
                </div>
                <h3 className="font-medium">Fill in Data</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-10">
                Add your data following the column headers exactly
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  3
                </div>
                <h3 className="font-medium">Upload & Review</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-10">
                Upload your file and review any errors before confirming
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download student data, grades, and attendance records as CSV files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {noCohortMessage ? (
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div className="p-3 rounded-full bg-amber-500/10 mb-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold mb-1">No Cohorts Assigned</h3>
              <p className="text-sm text-muted-foreground">{noCohortMessage}</p>
            </div>
          ) : (
            <>
              {/* Cohort Filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Filter by Cohort:</span>
                <Select value={exportCohortId} onValueChange={setExportCohortId}>
                  <SelectTrigger className="w-64">
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
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleExport("students")}
                  disabled={exporting !== null}
                >
                  {exporting === "students" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export Students
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("grades")}
                  disabled={exporting !== null}
                >
                  {exporting === "grades" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export Grades
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("attendance")}
                  disabled={exporting !== null}
                >
                  {exporting === "attendance" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export Attendance
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {exportCohortId === "all"
                  ? "Exporting data for all cohorts"
                  : `Exporting data for selected cohort only`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {isAdmin && (
        <BulkImportDialog
          type="students"
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          cohorts={cohorts}
          onSuccess={() => {}}
        />
      )}

      <BulkImportDialog
        type="grades"
        open={gradeDialogOpen}
        onOpenChange={setGradeDialogOpen}
        onSuccess={() => {}}
      />
    </div>
  );
}
