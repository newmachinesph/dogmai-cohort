"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Cohort {
  id: string;
  name: string;
  modules: { id: string; title: string }[];
}

interface RubricItem {
  criteria: string;
  points: number;
  description: string;
}

export default function NewAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCohortId = searchParams.get("cohortId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  // Form state
  const [cohortId, setCohortId] = useState(preselectedCohortId || "");
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lateDeadline, setLateDeadline] = useState("");
  const [maxPoints, setMaxPoints] = useState(100);
  const [passingScore, setPassingScore] = useState(60);
  const [submissionType, setSubmissionType] = useState("FILE");
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [isPublished, setIsPublished] = useState(false);
  const [rubric, setRubric] = useState<RubricItem[]>([]);

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await fetch("/api/cohorts?staffOnly=true");
        if (!res.ok) throw new Error("Failed to fetch cohorts");
        const data = await res.json();

        // Fetch modules for each cohort
        const cohortsWithModules = await Promise.all(
          data.cohorts.map(async (cohort: { id: string; name: string }) => {
            const modulesRes = await fetch(`/api/modules?cohortId=${cohort.id}`);
            const modulesData = await modulesRes.json();
            return {
              ...cohort,
              modules: modulesData.modules || [],
            };
          })
        );

        setCohorts(cohortsWithModules);
      } catch (error) {
        console.error("Error fetching cohorts:", error);
        toast.error("Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    };

    fetchCohorts();
  }, []);

  const selectedCohort = cohorts.find((c) => c.id === cohortId);

  const addRubricItem = () => {
    setRubric([...rubric, { criteria: "", points: 10, description: "" }]);
  };

  const updateRubricItem = (index: number, field: keyof RubricItem, value: string | number) => {
    const newRubric = [...rubric];
    newRubric[index] = { ...newRubric[index], [field]: value };
    setRubric(newRubric);
  };

  const removeRubricItem = (index: number) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cohortId || !title || !description || !instructions || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId,
          moduleId: moduleId || null,
          title,
          description,
          instructions,
          dueDate,
          lateDeadline: lateDeadline || null,
          maxPoints,
          passingScore,
          submissionType,
          maxFileSize,
          isPublished,
          rubric: rubric.length > 0 ? rubric : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }

      const data = await res.json();
      toast.success("Assignment created successfully");
      router.push(`/staff/assignments/${data.assignment.id}`);
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create assignment");
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff/assignments">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Assignment</h1>
          <p className="text-muted-foreground">Add a new assignment for students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cohort">Cohort *</Label>
                    <Select value={cohortId} onValueChange={setCohortId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cohort" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts.map((cohort) => (
                          <SelectItem key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="module">Module (Optional)</Label>
                    <Select value={moduleId} onValueChange={setModuleId} disabled={!cohortId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No module</SelectItem>
                        {selectedCohort?.modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Assignment title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the assignment"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions *</Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Detailed instructions for students"
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rubric */}
            <Card>
              <CardHeader>
                <CardTitle>Grading Rubric (Optional)</CardTitle>
                <CardDescription>Define criteria for grading this assignment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rubric.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <Label>Criteria {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRubricItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Criteria name"
                      value={item.criteria}
                      onChange={(e) => updateRubricItem(index, "criteria", e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Points</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.points}
                          onChange={(e) => updateRubricItem(index, "points", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          placeholder="Optional description"
                          value={item.description}
                          onChange={(e) => updateRubricItem(index, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addRubricItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rubric Item
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateDeadline">Late Deadline (Optional)</Label>
                  <Input
                    id="lateDeadline"
                    type="datetime-local"
                    value={lateDeadline}
                    onChange={(e) => setLateDeadline(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxPoints">Max Points</Label>
                    <Input
                      id="maxPoints"
                      type="number"
                      min={1}
                      value={maxPoints}
                      onChange={(e) => setMaxPoints(parseInt(e.target.value) || 100)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Passing Score</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min={0}
                      max={maxPoints}
                      value={passingScore}
                      onChange={(e) => setPassingScore(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submissionType">Submission Type</Label>
                  <Select value={submissionType} onValueChange={setSubmissionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FILE">File Upload</SelectItem>
                      <SelectItem value="TEXT">Text Entry</SelectItem>
                      <SelectItem value="URL">URL/Link</SelectItem>
                      <SelectItem value="GITHUB">GitHub Repository</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {submissionType === "FILE" && (
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      min={1}
                      max={100}
                      value={maxFileSize}
                      onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 10)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Publish */}
            <Card>
              <CardHeader>
                <CardTitle>Publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Publish immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      Students will be notified when published
                    </p>
                  </div>
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isPublished ? "Create & Publish" : "Create as Draft"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
