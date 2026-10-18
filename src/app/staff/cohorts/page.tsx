"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, MapPin, Loader2, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Cohort {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  mode: string;
  startDate: string;
  endDate: string;
  status: string;
  maxStudents: number;
  _count: {
    enrollments: number;
    staffAssignments: number;
    sessions: number;
  };
}

export default function StaffCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await fetch("/api/cohorts");
        if (res.ok) {
          const data = await res.json();
          setCohorts(data.cohorts);
        }
      } catch (error) {
        console.error("Error fetching cohorts:", error);
        toast.error("Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    };
    fetchCohorts();
  }, []);

  const filteredCohorts = activeTab === "all"
    ? cohorts
    : cohorts.filter((c) => c.status === activeTab.toUpperCase());

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE": return "default";
      case "UPCOMING": return "secondary";
      case "COMPLETED": return "outline";
      default: return "outline";
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "ONLINE": return "Remote";
      case "ONSITE": return "On-site";
      default: return "Hybrid";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Cohorts</h1>
        <p className="text-muted-foreground mt-1">Cohorts you are assigned to</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({cohorts.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({cohorts.filter(c => c.status === "ACTIVE").length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({cohorts.filter(c => c.status === "UPCOMING").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({cohorts.filter(c => c.status === "COMPLETED").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredCohorts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No cohorts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCohorts.map((cohort) => (
            <Card key={cohort.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant={getStatusVariant(cohort.status)}>{cohort.status}</Badge>
                  <Badge variant="outline">{getModeIcon(cohort.mode)}</Badge>
                </div>
                <CardTitle className="mt-2">{cohort.name}</CardTitle>
                {cohort.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{cohort.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {cohort.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {cohort._count?.enrollments || 0} / {cohort.maxStudents} students
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {cohort._count?.sessions || 0} sessions
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/staff/cohorts/${cohort.id}/sessions`}>
                      Sessions
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/staff/cohorts/${cohort.id}/files`}>
                      Files
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/staff/cohorts/${cohort.id}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
