"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatRelativeTime, getInitials } from "@/lib/utils";
import {
  Search,
  FileText,
  ClipboardList,
  CheckCircle,
  BarChart3,
  Loader2,
  Filter,
} from "lucide-react";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  score: number | null;
  content: string | null;
  fileUrl: string | null;
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
    dueDate: string;
    cohort: {
      id: string;
      name: string;
    };
  };
}

interface Cohort {
  id: string;
  name: string;
}

export default function AdminGradingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [cohortFilter, setCohortFilter] = useState("all");

  // Build submissions URL with cohort filter
  const submissionsUrl = cohortFilter === "all"
    ? "/api/submissions?limit=100"
    : `/api/submissions?limit=100&cohortId=${cohortFilter}`;

  // Use SWR for caching - data persists when navigating away and back
  const { data: cohortsData } = useSWR<{ cohorts: Cohort[] }>(
    "/api/cohorts?limit=100",
    fetcher,
    { dedupingInterval: 300000 } // Cache for 5 minutes
  );

  const { data: submissionsData, isLoading: loading } = useSWR<{ submissions: Submission[] }>(
    submissionsUrl,
    fetcher,
    {
      dedupingInterval: 30000, // Cache for 30 seconds (grading changes more often)
      revalidateOnFocus: false,
    }
  );

  const cohorts = cohortsData?.cohorts || [];
  const submissions = submissionsData?.submissions || [];

  const filteredSubmissions = submissions.filter((submission) => {
    const studentName = submission.user.displayName || submission.user.username;
    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.assignment.cohort.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "pending") {
      return matchesSearch && ["SUBMITTED", "LATE"].includes(submission.status);
    }
    if (statusFilter === "graded") {
      return matchesSearch && submission.status === "GRADED";
    }
    if (statusFilter === "draft") {
      return matchesSearch && submission.status === "DRAFT";
    }
    return matchesSearch;
  });

  const pendingCount = submissions.filter((s) =>
    ["SUBMITTED", "LATE"].includes(s.status)
  ).length;
  const gradedCount = submissions.filter((s) => s.status === "GRADED").length;
  const lateCount = submissions.filter((s) => s.status === "LATE").length;

  const avgScore =
    gradedCount > 0
      ? Math.round(
          submissions
            .filter((s) => s.status === "GRADED" && s.score !== null)
            .reduce((sum, s) => sum + (s.score || 0), 0) /
            submissions.filter((s) => s.status === "GRADED" && s.score !== null).length
        )
      : 0;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "default";
      case "LATE":
        return "destructive";
      case "GRADED":
        return "secondary";
      case "DRAFT":
        return "outline";
      default:
        return "outline";
    }
  };

  // Only show loading spinner if no cached data
  if (loading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Grading Center</h1>
        <p className="text-muted-foreground mt-1">
          Review and grade student submissions across all cohorts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <ClipboardList className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{lateCount}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{gradedCount}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submissions.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student, assignment, or cohort..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={cohortFilter} onValueChange={setCohortFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
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
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="graded">Graded ({gradedCount})</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        {filteredSubmissions.length === 0 ? (
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No submissions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : statusFilter === "pending"
                  ? "No submissions to grade yet"
                  : cohortFilter !== "all"
                  ? "No submissions in this cohort"
                  : "No submissions yet"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {submission.user.avatarUrl && (
                          <AvatarImage src={submission.user.avatarUrl} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(
                            submission.user.displayName || submission.user.username
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">
                          {submission.user.displayName || submission.user.username}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          @{submission.user.username}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{submission.assignment.title}</span>
                      <p className="text-xs text-muted-foreground">
                        Max: {submission.assignment.maxPoints} pts
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {submission.assignment.cohort.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(submission.submittedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(submission.status)}>
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {submission.score !== null ? (
                      <span
                        className={`font-medium ${
                          submission.score >= 60 ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {submission.score}/{submission.assignment.maxPoints}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/grading/${submission.id}`}>
                        {submission.status === "GRADED" ? "Review" : "Grade"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
