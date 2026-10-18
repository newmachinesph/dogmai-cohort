"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Cohort {
  id: string;
  name: string;
}

interface BulkImportDialogProps {
  type: "students" | "grades";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohorts?: Cohort[];
  onSuccess?: () => void;
}

interface ImportResult {
  created?: number;
  graded?: number;
  skipped?: number;
  enrolled?: number;
  errors: { row: number; email: string; message: string }[];
}

export function BulkImportDialog({
  type,
  open,
  onOpenChange,
  cohorts = [],
  onSuccess,
}: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [sendEmails, setSendEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    const templateType = type === "students" ? "students" : "grades";
    window.open(`/api/bulk/templates?type=${templateType}`, "_blank");
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (type === "students" && selectedCohort) {
        formData.append("cohortId", selectedCohort);
      }

      if (sendEmails) {
        formData.append(
          type === "students" ? "sendWelcomeEmails" : "sendNotifications",
          "true"
        );
      }

      const endpoint =
        type === "students" ? "/api/bulk/import-students" : "/api/bulk/batch-grade";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data.results);

      if (data.results.errors.length === 0) {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "Failed to import");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setSelectedCohort("");
      setSendEmails(false);
      setResult(null);
      setError(null);
      onOpenChange(false);
    }
  };

  const title = type === "students" ? "Import Students" : "Batch Grade";
  const description =
    type === "students"
      ? "Upload a CSV file to bulk import students"
      : "Upload a CSV file to grade multiple submissions at once";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">Download Template</p>
              <p className="text-xs text-muted-foreground">
                Get a sample CSV file with the correct format
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File upload */}
          <div>
            <Label htmlFor="file-upload">CSV File</Label>
            <div
              className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
                </div>
              )}
            </div>
          </div>

          {/* Cohort selection (for student import) */}
          {type === "students" && (
            <div>
              <Label>Enroll in Cohort (optional)</Label>
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a cohort..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No enrollment</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email notifications */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-emails"
              checked={sendEmails}
              onCheckedChange={(checked) => setSendEmails(!!checked)}
            />
            <Label htmlFor="send-emails" className="text-sm">
              {type === "students"
                ? "Send welcome emails with temporary passwords"
                : "Send grade notification emails"}
            </Label>
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results display */}
          {result && (
            <div className="space-y-3">
              <Alert variant={result.errors.length === 0 ? "default" : "destructive"}>
                {result.errors.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {type === "students" ? (
                    <span>
                      Created: {result.created}, Skipped: {result.skipped}
                      {result.enrolled ? `, Enrolled: ${result.enrolled}` : ""}
                    </span>
                  ) : (
                    <span>
                      Graded: {result.graded}, Skipped: {result.skipped}
                    </span>
                  )}
                  {result.errors.length > 0 && (
                    <span className="block mt-1">
                      Errors: {result.errors.length}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-destructive">
                      Row {err.row}: {err.email} - {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
