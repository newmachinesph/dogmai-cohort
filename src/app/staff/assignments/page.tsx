"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Plus, Loader2, FileText, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Cohort {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  submissionType: string;
  isPublished: boolean;
  module: { id: string; title: string } | null;
  _count?: { submissions: number };
}

export default function StaffAssignmentsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCohortMessage, setNoCohortMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await fetch("/api/cohorts");
        if (res.ok) {
          const data = await res.json();
          setCohorts(data.cohorts);
          if (data.message) {
            setNoCohortMessage(data.message);
          }
          if (data.cohorts.length > 0) {
            setSelectedCohortId(data.cohorts[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching cohorts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCohorts();
  }, []);

  useEffect(() => {
    if (!selectedCohortId) return;

    const fetchAssignments = async () => {
      try {
        const res = await fetch(`/api/assignments?cohortId=${selectedCohortId}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments);
        }
      } catch (error) {
        console.error("Error fetching assignments:", error);
        toast.error("Failed to load assignments");
      }
    };
    fetchAssignments();
  }, [selectedCohortId]);

  const isPastDue = (date: string) => new Date(date) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (noCohortMessage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Manage cohort assignments</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-amber-500/10 mb-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Cohorts Assigned</h3>
              <p className="text-muted-foreground">{noCohortMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Manage cohort assignments</p>
        </div>
        <Button asChild>
          <Link href={`/staff/assignments/new?cohortId=${selectedCohortId}`}>
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignments.filter(a => a.isPublished).length}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {assignments.reduce((sum, a) => sum + (a._count?.submissions || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assignments yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell>{assignment.module?.title || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatDate(assignment.dueDate)}
                        {isPastDue(assignment.dueDate) && (
                          <Badge variant="secondary">Past Due</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{assignment.maxPoints}</TableCell>
                    <TableCell>{assignment._count?.submissions || 0}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.isPublished ? "default" : "outline"}>
                        {assignment.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/staff/assignments/${assignment.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
