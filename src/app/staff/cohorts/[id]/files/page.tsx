"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  File,
  FileText,
  FileImage,
  FileArchive,
  FileCode,
  Loader2,
  Plus,
  Trash2,
  Upload,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface CohortFile {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: string;
  description: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    displayName: string | null;
    username: string;
  };
}

interface Cohort {
  id: string;
  name: string;
  slug: string;
  location: string;
  status: string;
}

export default function CohortFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: cohortId } = use(params);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [files, setFiles] = useState<CohortFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "GENERAL",
    file: null as File | null,
  });

  const categories = [
    { value: "GENERAL", label: "General" },
    { value: "RESOURCE", label: "Resource" },
    { value: "ASSIGNMENT", label: "Assignment" },
    { value: "OTHER", label: "Other" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cohortRes, filesRes] = await Promise.all([
          fetch(`/api/cohorts/${cohortId}`),
          fetch(`/api/files?cohortId=${cohortId}`),
        ]);

        if (cohortRes.ok) {
          const data = await cohortRes.json();
          setCohort(data.cohort);
        }

        if (filesRes.ok) {
          const data = await filesRes.json();
          setFiles(data.files || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load files");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cohortId]);

  const handleUpload = async () => {
    if (!formData.file || !formData.name) {
      toast.error("Please select a file and enter a name");
      return;
    }

    setUploading(true);
    try {
      // For now, we'll just show a placeholder since UploadThing needs setup
      // In production, you'd upload the file first then save the metadata
      toast.info("File upload requires UploadThing configuration");

      // Simulating the API call structure
      // const res = await fetch("/api/files", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     cohortId,
      //     name: formData.name,
      //     description: formData.description,
      //     category: formData.category,
      //     fileName: formData.file.name,
      //     fileUrl: "uploaded-url",
      //     fileSize: formData.file.size,
      //     fileType: formData.file.type,
      //   }),
      // });

      handleCloseDialog();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      name: "",
      description: "",
      category: "GENERAL",
      file: null,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes("zip") || fileType.includes("rar")) return <FileArchive className="h-5 w-5 text-amber-500" />;
    if (fileType.includes("javascript") || fileType.includes("typescript") || fileType.includes("json"))
      return <FileCode className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case "RESOURCE": return "default";
      case "ASSIGNMENT": return "secondary";
      case "SUBMISSION": return "outline";
      default: return "outline";
    }
  };

  const filteredFiles = selectedCategory === "all"
    ? files
    : files.filter((f) => f.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cohort not found</p>
        <Button asChild className="mt-4">
          <Link href="/staff/cohorts">Back to Cohorts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff/cohorts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{cohort.name} - Files</h1>
          <p className="text-muted-foreground mt-1">
            Manage shared files and resources
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
              <DialogDescription>
                Share a file with this cohort
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({
                        ...formData,
                        file,
                        name: formData.name || file.name.split(".")[0],
                      });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Week 1 Slides"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          All ({files.length})
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label} ({files.filter((f) => f.category === cat.value).length})
          </Button>
        ))}
      </div>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Files
          </CardTitle>
          <CardDescription>
            {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} in this cohort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files uploaded yet</p>
              <p className="text-sm mt-1">Upload files to share with students</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.fileType)}
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {file.fileName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryVariant(file.category)}>
                        {file.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                    <TableCell>{formatDate(file.createdAt)}</TableCell>
                    <TableCell>
                      {file.uploadedBy.displayName || file.uploadedBy.username}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={file.fileUrl} download={file.fileName}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
